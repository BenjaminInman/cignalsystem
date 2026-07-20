#!/usr/bin/env python3
"""
Cignal System — FRED ingestion (national series), vintage-aware.
Keeps the Supabase observations table current for every indicator whose
source = 'FRED'. Dynamically picks them up by reading indicators.source_series
(the FRED series IDs already stored), so adding a new FRED indicator row is
all that's needed to include it here.

Same revision model as ZORI: first sighting of a (indicator, national, date)
-> revision 0 (first print, kept forever); a value FRED has revised -> next
revision; unchanged -> skipped. Refreshes mv_indicator_analytics at the end.

Env:  FRED_API_KEY, SUPABASE_DB_URL (Session pooler URI)
Deps: pip install psycopg2-binary requests
"""
import io, os, sys, datetime as dt
import requests, psycopg2

FRED_URL = "https://api.stlouisfed.org/fred/series/observations"


def fetch_fred(series_id, key):
    r = requests.get(FRED_URL, params={
        "series_id": series_id, "api_key": key, "file_type": "json",
    }, timeout=60)
    r.raise_for_status()
    rows = []
    for o in r.json().get("observations", []):
        v = o.get("value")
        if v in (None, ".", ""):       # FRED uses "." for missing
            continue
        try:
            rows.append((o["date"], float(v)))
        except ValueError:
            continue
    return rows


def fetch_release_dates(series_id, key):
    """Map obs_date -> the date the value was FIRST published (ALFRED vintages).

    Bounded to a recent realtime window so daily series stay small and don't 400.
    The cron only inserts new/changed observations, which are recent, so recent
    vintages are all we need. Anything whose first release predates the window is
    treated as unknown (caller falls back to today()). Best-effort: on any error
    we return {} and the caller uses today()."""
    floor = (dt.date.today() - dt.timedelta(days=450)).isoformat()
    try:
        r = requests.get(FRED_URL, params={
            "series_id": series_id, "api_key": key, "file_type": "json",
            "output_type": 4, "realtime_start": floor, "realtime_end": "9999-12-31",
        }, timeout=60)
        r.raise_for_status()
        first = {}
        for o in r.json().get("observations", []):
            d, rs = o.get("date"), o.get("realtime_start")
            if not d or not rs or rs <= floor:   # rs == floor => released before our window
                continue
            if d not in first or rs < first[d]:
                first[d] = rs
        return first
    except Exception:
        return {}


def main():
    key = os.environ.get("FRED_API_KEY")
    db  = os.environ.get("SUPABASE_DB_URL")
    if not key or not db:
        sys.exit("ERROR: FRED_API_KEY and SUPABASE_DB_URL must both be set")
    release = dt.date.today()   # fallback only, when ALFRED has no vintage for an obs
    conn = psycopg2.connect(db); conn.autocommit = False
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM regions WHERE region_type='national' AND code='US'")
            row = cur.fetchone()
            if not row:
                sys.exit("ERROR: national/US region not found — run the geography migration first")
            nat = row[0]
            cur.execute("SELECT id, slug, source_series FROM indicators WHERE source = 'FRED' ORDER BY slug")
            inds = cur.fetchall()
            print(f"FRED ingestion — release_date {release} | {len(inds)} indicators")
            for ind_id, slug, sid in inds:
                rows = fetch_fred(sid, key)
                if not rows:
                    print(f"  [{slug}] {sid}: no observations"); continue
                reldates = fetch_release_dates(sid, key)   # obs_date -> true first release
                cur.execute("DROP TABLE IF EXISTS _fred_stage;")
                cur.execute("CREATE TEMP TABLE _fred_stage (obs_date date, value numeric, release_date date);")
                buf = io.StringIO()
                for d, v in rows:
                    buf.write(f"{d},{v},{reldates.get(d, '')}\n")   # empty -> NULL -> today() fallback
                buf.seek(0)
                cur.copy_expert("COPY _fred_stage (obs_date, value, release_date) FROM STDIN WITH CSV", buf)
                cur.execute("""
                    INSERT INTO observations (indicator_id, region_id, obs_date, value, revision, release_date)
                    SELECT %(ind)s, %(nat)s, s.obs_date, s.value,
                           COALESCE(latest.revision + 1, 0),
                           COALESCE(s.release_date, %(rel)s)
                    FROM _fred_stage s
                    LEFT JOIN LATERAL (
                        SELECT o.value, o.revision FROM observations o
                        WHERE o.indicator_id = %(ind)s AND o.region_id = %(nat)s AND o.obs_date = s.obs_date
                        ORDER BY o.revision DESC LIMIT 1
                    ) latest ON true
                    WHERE latest.value IS DISTINCT FROM s.value;
                """, {"ind": ind_id, "nat": nat, "rel": release})
                print(f"  [{slug}] {sid}: {len(rows)} pulled, {cur.rowcount} inserted")
        conn.commit(); print("Done. Committed.")
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("SET statement_timeout = 0")
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_indicator_analytics;")
        print("Refreshed mv_indicator_analytics.")
    except Exception:
        conn.rollback(); print("Rolled back — no partial writes."); raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
