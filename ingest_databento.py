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
    "PHM", "DHI", "LEN", "TMHC", "KBH", "TOL", "LGIH", "CCS", "NVR",
    # Home Improvement
    "HD", "LOW", "FND", "FAST", "BLDR",
    # Lenders (FNMA/FMCC handled separately as GSE signals)
    "PFSI", "LFT", "ABR", "WFC", "FBRT", "WD",
    # Brokerages / CRE services
    "CBRE", "JLL", "COMP", "AGNT", "CWK", "MMI", "CIGI", "NMRK",
    # Residential REITs
    "EQR", "CPT", "ESS", "AVB", "MAA", "UDR", "IRT", "NXRT",
]


def latest_two_closes():
    """Return {symbol: (as_of_date, close, prev_close)} using the two most
    recent trading sessions available in EQUS.SUMMARY."""
    client = db.Historical(DBN_KEY)
    # Clamp to the dataset's actual available end -- querying past it 422s.
    avail = client.metadata.get_dataset_range(dataset="EQUS.SUMMARY")
    end = dt.date.fromisoformat(avail["end"][:10])
    start = end - dt.timedelta(days=12)
    data = client.timeseries.get_range(
        dataset="EQUS.SUMMARY",
        schema="ohlcv-1d",
        symbols=SYMBOLS,
        stype_in="raw_symbol",
        stype_out="instrument_id",
        start=start.isoformat(),
        end=end.isoformat(),
    )
    df = data.to_df()  # to_df maps instrument_id back to 'symbol' via metadata
    if df.empty:
        raise RuntimeError("Databento returned no bars")
    df = df.reset_index()
    df["date"] = df["ts_event"].dt.date
    out = {}
    for sym, g in df.groupby("symbol"):
        g = g.sort_values("date")
        if len(g) < 2:
            # a symbol with only one session: no prior close -> skip (donut needs a move)
            continue
        last, prev = g.iloc[-1], g.iloc[-2]
        out[sym] = (last["date"], float(last["close"]), float(prev["close"]))
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
                   ON CONFLICT (symbol) DO UPDATE SET
                     price = EXCLUDED.price,
                     prev_close = EXCLUDED.prev_close,
                     chg_pct = EXCLUDED.chg_pct,
                     as_of = EXCLUDED.as_of,
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
