#!/usr/bin/env python3
"""
Cignal System — Census SOMA absorption ingestion (multifamily rentals).

Loads the 3-month absorption RATE for new market-rate rental apartments (5+ unit
buildings) from the Census Bureau's Survey of Market Absorption of New Multifamily
Units (SOMA) — the original source, not a secondary write-up. This is the share of
newly completed apartments leased within three months of completion: a leading
demand read on new supply, and a core hypersupply tell for the cycle.

SOMA is quarterly (released ~first week of Mar/Jun/Sep/Dec), so this runs on a
quarterly cron and no-ops until a new quarter appears. Same first-print/revision
model as the FRED, ZORI, and ACS pipelines — revision 0 is never overwritten;
a changed value is stored as the next revision.

Hard Signal only: this writes to `observations` for the `absorption` indicator
(national / US). It never touches news/Field Intel tables.

Env:  CENSUS_API_KEY, SUPABASE_DB_URL (Session pooler URI)   [same secrets as ingest_census]
Deps: pip install psycopg2-binary requests
"""
import os, sys, datetime as dt
import requests, psycopg2

SOMA_URL = "https://api.census.gov/data/timeseries/soma"
INDICATOR_SLUG = "absorption"
REGION = ("national", "US")
START_YEAR = 2015          # SOMA quarterly history; deep enough for YoY/z-score context

# We pull a broad rental (UNIT_TYPE_CODE=R) quarterly (ESTIMATE_TYPE_CODE=Q) slice
# with the descriptive title columns, then select the single record that is the
# 3-month absorption RATE (a percent) rather than a unit count. Selecting by
# human-readable labels is robust to SOMA's numeric dimension codes shifting.
GET_COLS = [
    "TABLE_STUB_TITLE", "DESCR_UNIQ_ROW_CHAR_CODE",
    "DESCR_UNIQ_COL_ABS_CODE", "ESTIMATE", "ESTIMATE_OVERRIDE",
]

# --- 3-month absorption-rate selector -------------------------------------------
# Verified against the live SOMA API. The absorption data sits under the "Asking
# Rent" topic, broken out by rent band; the all-units headline rate is the single
# record where the stub and row-characteristic are both "Total" and the absorption
# column is the 3-month window. (Cross-checked to published Census figures:
# 2021-Q3 peak = 75%, 2024-Q4 median asking rent = $1,941.)
STUB_TOTAL = "Total"
ROW_TOTAL  = "Total"
COL_3MONTH = "Percent absorbed within 3 months"


def qtr_end(year, q):
    """Quarter -> quarter-end obs_date (SOMA reports by completion quarter)."""
    m, d = {1: (3, 31), 2: (6, 30), 3: (9, 30), 4: (12, 31)}[int(q)]
    return dt.date(int(year), m, d)


def fetch_quarter(year, q, key):
    params = {
        "get": ",".join(GET_COLS),
        "for": "us:*",
        "time": f"{year}-Q{q}",
        "ESTIMATE_TYPE_CODE": "Q",
        "UNIT_TYPE_CODE": "R",
        "key": key,
    }
    try:
        r = requests.get(SOMA_URL, params=params, timeout=60)
        return r.json() if r.status_code == 200 else None
    except Exception:
        return None


def three_month_rate(rows):
    """From one quarter's records, return the 3-month absorption rate (float %)."""
    if not rows or len(rows) < 2:
        return None
    hdr = rows[0]
    for rec in rows[1:]:
        d = dict(zip(hdr, rec))
        if (d.get("TABLE_STUB_TITLE") == STUB_TOTAL
                and d.get("DESCR_UNIQ_ROW_CHAR_CODE") == ROW_TOTAL
                and d.get("DESCR_UNIQ_COL_ABS_CODE") == COL_3MONTH):
            raw = d.get("ESTIMATE_OVERRIDE") or d.get("ESTIMATE")
            try:
                v = float(raw)
            except (TypeError, ValueError):
                return None
            return round(v, 1) if 0 <= v <= 100 else None
    return None


def upsert(cur, iid, region_id, obs_date, val, release):
    cur.execute(
        "SELECT value, revision FROM observations WHERE indicator_id=%s "
        "AND region_id=%s AND obs_date=%s ORDER BY revision DESC LIMIT 1",
        (iid, region_id, obs_date))
    prev = cur.fetchone()
    if prev is None:
        cur.execute(
            "INSERT INTO observations(indicator_id,region_id,obs_date,value,revision,release_date)"
            " VALUES(%s,%s,%s,%s,0,%s)", (iid, region_id, obs_date, val, release))
        return "insert"
    if float(prev[0]) != float(val):
        cur.execute(
            "INSERT INTO observations(indicator_id,region_id,obs_date,value,revision,release_date)"
            " VALUES(%s,%s,%s,%s,%s,%s)", (iid, region_id, obs_date, val, prev[1] + 1, release))
        return "revise"
    return "skip"


def main():
    key = os.environ.get("CENSUS_API_KEY")
    db = os.environ.get("SUPABASE_DB_URL")
    if not key or not db:
        sys.exit("ERROR: CENSUS_API_KEY and SUPABASE_DB_URL must both be set")
    release = dt.date.today()
    end_year = release.year
    conn = psycopg2.connect(db); conn.autocommit = False
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM indicators WHERE slug=%s", (INDICATOR_SLUG,))
            row = cur.fetchone()
            if not row:
                sys.exit(f"ERROR: indicator '{INDICATOR_SLUG}' not found")
            iid = row[0]
            cur.execute("SELECT id FROM regions WHERE region_type=%s AND code=%s", REGION)
            row = cur.fetchone()
            if not row:
                sys.exit(f"ERROR: region {REGION} not found")
            region_id = row[0]

            ins = rev = skip = miss = 0
            for year in range(START_YEAR, end_year + 1):
                for q in (1, 2, 3, 4):
                    data = fetch_quarter(year, q, key)
                    if not data:
                        continue
                    rate = three_month_rate(data)
                    if rate is None:
                        miss += 1
                        continue
                    r = upsert(cur, iid, region_id, qtr_end(year, q), rate, release)
                    ins += r == "insert"; rev += r == "revise"; skip += r == "skip"
            print(f"SOMA 3-mo absorption — inserted {ins}, revised {rev}, "
                  f"unchanged {skip}, quarters-without-rate {miss}")
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_indicator_analytics;")
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
