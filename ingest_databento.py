#!/usr/bin/env python3
"""
Ingest end-of-day equity closes for the /indices donuts from Databento.

Dataset: EQUS.SUMMARY, schema ohlcv-1d -- consolidated daily OHLCV across all
NMS exchanges. This product carries no exchange license fees and permits public
display/redistribution, which is why it replaced the unlicensed Yahoo scrape.

Writes latest close + prior close + daily % move per symbol into equity_quotes.
The /api/quotes route reads from that table, so the page never calls Databento
live -- it reads Cignal's own stored daily records.

FNMA and FMCC are intentionally NOT here: they trade OTC (OTCQB), outside this
NMS dataset, and are surfaced on /indices as GSE multifamily delinquency signals
(fnma_mf_delinquency / fmcc_mf_delinquency) instead of stock quotes.

Requires: DATABENTO_API_KEY, SUPABASE_DB_URL.
"""

import os
import datetime as dt

import psycopg2
import databento as db

DB_URL = os.environ["SUPABASE_DB_URL"]
DBN_KEY = os.environ["DATABENTO_API_KEY"]

# 34 exchange-listed tickers. EXPI -> AGNT (eXp World Holdings renamed May 2026).
SYMBOLS = [
    # Home Builders
    "PHM", "DHI", "LEN", "KBH", "TOL", "LGIH", "CCS", "NVR",
    # Home Improvement
    "HD", "LOW", "FND", "FAST", "BLDR",
    # Lenders (FNMA/FMCC handled separately as GSE signals)
    "PFSI", "LFT", "ABR", "WFC", "FBRT", "WD",
    # Brokerages / CRE services
    "CBRE", "JLL", "COMP", "AGNT", "CWK", "MMI", "CIGI", "NMRK",
    # Residential REITs
    # VMRK = Vivmark Residential, the Aug-2026 AvalonBay(AVB)+Equity Residential(EQR)
    # merger of equals; AVB retired, EQR renamed/re-tickered to VMRK on 2026-08-18.
    "VMRK", "CPT", "ESS", "MAA", "UDR", "IRT", "NXRT",
]


def _closes(client, symbols, stype, start, end, id_to_sym):
    """Fetch each symbol's two most recent closes. When id_to_sym is given, the
    request is by instrument_id and results are keyed back to our ticker via it;
    otherwise results are keyed by the raw_symbol Databento returns."""
    data = client.timeseries.get_range(
        dataset="EQUS.SUMMARY",
        schema="ohlcv-1d",
        symbols=symbols,
        stype_in=stype,
        stype_out="instrument_id",
        start=start.isoformat(),
        end=end.isoformat(),
    )
    df = data.to_df()
    if df.empty:
        return {}
    df = df.reset_index()
    df["date"] = df["ts_event"].dt.date
    if id_to_sym is not None:
        col = "instrument_id" if "instrument_id" in df.columns else "symbol"
        df["_key"] = df[col].astype(str).map(id_to_sym)
    else:
        df["_key"] = df["symbol"]
    out = {}
    for sym, g in df.groupby("_key"):
        if not isinstance(sym, str) or not sym:
            continue
        g = g.sort_values("date")
        if len(g) < 2:
            # only one session -> no prior close -> skip (donut needs a move)
            continue
        last, prev = g.iloc[-1], g.iloc[-2]
        out[sym] = (last["date"], float(last["close"]), float(prev["close"]))
    return out


def latest_two_closes():
    """Return {symbol: (as_of_date, close, prev_close)} using the two most
    recent trading sessions available in EQUS.SUMMARY."""
    client = db.Historical(DBN_KEY)
    # Clamp to the dataset's actual available end -- querying past it 422s.
    avail = client.metadata.get_dataset_range(dataset="EQUS.SUMMARY")
    end = dt.date.fromisoformat(avail["end"][:10])
    start = end - dt.timedelta(days=12)

    out = _closes(client, SYMBOLS, "raw_symbol", start, end, None)

    # A symbol that's missing, or whose latest session is behind the dataset end,
    # has usually rotated instrument_id -- its post-rotation bars stop mapping back
    # under raw_symbol. Resolve those laggards to their current instrument_id(s)
    # over the window and re-request by id so we recover the fresh sessions.
    laggards = [s for s in SYMBOLS if s not in out or out[s][0] < end]
    if laggards:
        print(f"resolving laggards via symbology: {laggards}")
        try:
            res = client.symbology.resolve(
                dataset="EQUS.SUMMARY",
                symbols=laggards,
                stype_in="raw_symbol",
                stype_out="instrument_id",
                start_date=start.isoformat(),
                end_date=end.isoformat(),
            )
            id_to_sym = {}
            for sym, ivs in (res.get("result") or {}).items():
                for iv in ivs or []:
                    iid = iv.get("s")
                    if iid:
                        id_to_sym[str(iid)] = sym
            print(f"  resolved {len(id_to_sym)} instrument_id(s) for {len(laggards)} laggard(s)")
            if id_to_sym:
                fixed = _closes(client, list(id_to_sym), "instrument_id", start, end, id_to_sym)
                for s, v in fixed.items():
                    if s not in out or v[0] > out[s][0]:
                        out[s] = v
                print(f"  recovered current sessions for: {sorted(fixed)}")
        except Exception as e:
            print(f"  symbology fallback error: {e}")

    return out


def main():
    quotes = latest_two_closes()
    missing = [s for s in SYMBOLS if s not in quotes]
    if missing:
        print(f"WARNING: no two-session data for {missing} (ticker change or halt?)")

    rows = []
    for sym, (as_of, close, prev) in quotes.items():
        if prev <= 0 or close <= 0:
            print(f"SKIP {sym}: non-positive price ({close}/{prev})")
            continue
        chg = (close / prev - 1) * 100.0
        rows.append((sym, close, prev, round(chg, 4), as_of))

    if not rows:
        raise RuntimeError("no valid rows to write")

    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            cur.executemany(
                """INSERT INTO equity_quotes (symbol, price, prev_close, chg_pct, as_of, source, updated_at)
                   VALUES (%s, %s, %s, %s, %s, 'databento', now())
                   ON CONFLICT (symbol, as_of) DO UPDATE SET
                     price = EXCLUDED.price,
                     prev_close = EXCLUDED.prev_close,
                     chg_pct = EXCLUDED.chg_pct,
                     source = 'databento',
                     updated_at = now()""",
                rows,
            )
        conn.commit()
        print(f"wrote {len(rows)} equity quotes; latest session {max(r[4] for r in rows)}")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
