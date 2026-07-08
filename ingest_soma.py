#!/usr/bin/env python3
"""
Cignal System — Census SOMA ingestion (new multifamily rentals).

Loads three metrics for newly completed market-rate rental apartments (5+ unit
buildings) from the Census Bureau's Survey of Market Absorption of New Multifamily
Units (SOMA) — the original source, not a secondary write-up:

  absorption       3-month absorption RATE (% leased within 3 months of completion)
  soma_completions total new apartments completed in the quarter (units)
  soma_new_rent    median asking rent of those new apartments ($/mo)

All three come from SOMA's "Asking Rent" table, so completions is the exact
denominator the absorption rate is measured against. Together they read the
supply/demand balance for new supply — a core hypersupply tell for the cycle.

SOMA is quarterly (released ~first week of Mar/Jun/Sep/Dec), so this runs on a
quarterly cron and no-ops until a new quarter appears. Same first-print/revision
model as the FRED, ZORI, and ACS pipelines — revision 0 is never overwritten; a
changed value is stored as the next revision.

Hard Signal only: writes to `observations` (national / US). Never touches
news/Field Intel tables.

Env:  CENSUS_API_KEY, SUPABASE_DB_URL (Session pooler URI)   [same secrets as ingest_census]
Deps: pip install psycopg2-binary requests
"""
import os, sys, datetime as dt
import requests, psycopg2

SOMA_URL = "https://api.census.gov/data/timeseries/soma"
REGION = ("national", "US")
START_YEAR = 2015          # SOMA quarterly history; deep enough for YoY/z-score context
TOPIC = "Asking Rent"      # the SOMA table that carries the rate, completions & median rent

GET_COLS = [
    "TABLE_TOPIC_TITLE", "TABLE_STUB_TITLE", "DESCR_UNIQ_ROW_CHAR_CODE",
    "DESCR_UNIQ_COL_ABS_CODE", "ESTIMATE", "ESTIMATE_OVERRIDE",
]

# Each metric is one record in the "Asking Rent" table, identified by its
# (stub, row-characteristic, absorption-column) triple. Verified against the live
# SOMA API and cross-checked to published Census figures (2021-Q3 rate = 75%,
# 2024-Q4 median asking rent = $1,941).
#   slug -> (stub, row_char, col_abs, lo, hi)   value kept only if lo <= v <= hi
METRICS = {
    "absorption":       ("Total", "Total",            "Percent absorbed within 3 months", 0, 100),
    "soma_completions": ("Total", "Total",            "Total units completed",            0, 5_000_000),
    "soma_new_rent":    ("Asking Monthly Rent", "Median (dollars)", "Total units completed", 0, 100_000),
}


def qtr_end(year, q):
    m, d = {1: (3, 31), 2: (6, 30), 3: (9, 30), 4: (12, 31)}[int(q)]
    return dt.date(int(year), m, d)


def fetch_quarter(year, q, key):
    params = {
        "get": ",".join(GET_COLS), "for": "us:*", "time": f"{year}-Q{q}",
        "ESTIMATE_TYPE_CODE": "Q", "UNIT_TYPE_CODE": "R", "key": key,
    }
    try:
        r = requests.get(SOMA_URL, params=params, timeout=60)
        return r.json() if r.status_code == 200 else None
    except Exception:
        return None


def extract(rows):
    """From one quarter's records, return {slug: value} for every metric found."""
    out = {}
    if not rows or len(rows) < 2:
        return out
    hdr = rows[0]
    for rec in rows[1:]:
        d = dict(zip(hdr, rec))
        if d.get("TABLE_TOPIC_TITLE") != TOPIC:
            continue
        for slug, (stub, rc, col, lo, hi) in METRICS.items():
            if slug in out:
                continue
            if (d.get("TABLE_STUB_TITLE") == stub
                    and d.get("DESCR_UNIQ_ROW_CHAR_CODE") == rc
                    and d.get("DESCR_UNIQ_COL_ABS_CODE") == col):
                raw = d.get("ESTIMATE_OVERRIDE") or d.get("ESTIMATE")
                try:
                    v = float(raw)
                except (TypeError, ValueError):
                    continue
                if lo <= v <= hi:
                    out[slug] = round(v, 1)
    return out


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
            ids = {}
            for slug in METRICS:
                cur.execute("SELECT id FROM indicators WHERE slug=%s", (slug,))
                row = cur.fetchone()
                if not row:
                    sys.exit(f"ERROR: indicator '{slug}' not found")
                ids[slug] = row[0]
            cur.execute("SELECT id FROM regions WHERE region_type=%s AND code=%s", REGION)
            row = cur.fetchone()
            if not row:
                sys.exit(f"ERROR: region {REGION} not found")
            region_id = row[0]

            ins = rev = skip = 0
            for year in range(START_YEAR, end_year + 1):
                for q in (1, 2, 3, 4):
                    data = fetch_quarter(year, q, key)
                    if not data:
                        continue
                    obs_date = qtr_end(year, q)
                    for slug, val in extract(data).items():
                        r = upsert(cur, ids[slug], region_id, obs_date, val, release)
                        ins += r == "insert"; rev += r == "revise"; skip += r == "skip"
            print(f"SOMA — inserted {ins}, revised {rev}, unchanged {skip} "
                  f"(across {', '.join(METRICS)})")
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_indicator_analytics;")
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
