#!/usr/bin/env python3
"""
Cignal System — metro employment by industry (BLS Current Employment Statistics).

Loads eleven MUTUALLY EXCLUSIVE industry supersectors for ~393 metros from the BLS
State & Metro Area (SM) series, so the platform can answer "which industries are
driving job growth in this market".

WHY THESE ELEVEN: BLS ships aggregates (00 Total Nonfarm, 05 Total Private,
06 Goods Producing, 07 Service-Providing, 08 Private Service Providing) and
sub-components (31/32 inside 30 Manufacturing; 41/42/43 inside 40 Trade) in the
same file. Ingesting those alongside the base sectors would double-count and would
rank "Total Private" as if it were an industry. The set below sums EXACTLY to total
nonfarm — verified against Nashville, Austin and Dallas to 0.0k.

Where a metro does not separately publish Mining (10) and Construction (20), BLS
publishes the combined 15 series instead; both are loaded and the API picks one so
construction is never counted twice.

NOT SEASONALLY ADJUSTED by design: metro seasonally-adjusted series exist for only
a handful of large areas, and every read here is year-over-year, which cancels
seasonality anyway.

Source file is ~315MB, so this streams rather than loading into memory.

Env:  SUPABASE_DB_URL      (BLS flat files need no key)
Deps: pip install psycopg2-binary requests
"""
import os, sys, calendar, datetime as dt
import requests, psycopg2

SM_DATA = "https://download.bls.gov/pub/time.series/sm/sm.data.0.Current"
UA = {"User-Agent": "CignalSystem/1.0 (ben@benjamininman.com)"}
START_YEAR = dt.date.today().year - 2      # ~30 months: enough for YoY + 24mo trajectory

# supersector code -> indicator slug. Mutually exclusive; sums to total nonfarm.
SUPERSECTORS = {
    "10": "metro_emp_mining",
    "15": "metro_emp_mining_construction",   # combined fallback
    "20": "metro_emp_construction",
    "30": "metro_emp_manufacturing",
    "40": "metro_emp_trade_transport",
    "50": "metro_emp_information",
    "55": "metro_emp_financial",
    "60": "metro_emp_prof_business",
    "65": "metro_emp_education_health",
    "70": "metro_emp_leisure_hospitality",
    "80": "metro_emp_other_services",
    "90": "metro_emp_government",
}
DATA_TYPE = "01"        # All Employees, in thousands


def month_end(y, m):
    return dt.date(y, m, calendar.monthrange(y, m)[1])


def stream_series(years):
    """Yield (area_code, supersector, obs_date, value) from the SM current file."""
    r = requests.get(SM_DATA, headers=UA, timeout=900, stream=True)
    r.raise_for_status()
    first = True
    for raw in r.iter_lines(decode_unicode=True):
        if raw is None:
            continue
        if first:
            first = False
            continue
        # Series ID is fixed-width: SMU + state(2) + area(5) + supersector(2)
        #                           + industry(6) + datatype(2)
        sid = raw[:20]
        if not sid.startswith("SMU") or sid[18:20] != DATA_TYPE:
            continue
        ss = sid[10:12]
        if ss not in SUPERSECTORS:
            continue
        if sid[12:18] != "000000":      # supersector TOTAL only, not finer detail
            continue
        parts = raw.split("\t")
        if len(parts) < 4:
            continue
        yr = parts[1].strip()
        if not yr.isdigit() or int(yr) < years:
            continue
        per = parts[2].strip()
        if not per.startswith("M") or per == "M13":
            continue
        try:
            val = float(parts[3].strip())
        except ValueError:
            continue
        yield sid[5:10], ss, month_end(int(yr), int(per[1:])), val


def main():
    db = os.environ.get("SUPABASE_DB_URL")
    if not db:
        sys.exit("ERROR: SUPABASE_DB_URL must be set")

    conn = psycopg2.connect(db); conn.autocommit = False
    try:
        with conn.cursor() as cur:
            ids = {}
            for ss, slug in SUPERSECTORS.items():
                cur.execute("SELECT id FROM indicators WHERE slug=%s", (slug,))
                row = cur.fetchone()
                if not row:
                    sys.exit(f"ERROR: indicator '{slug}' is not registered")
                ids[ss] = row[0]

            # SM area codes ARE CBSA codes, which is how metro regions are keyed.
            cur.execute("SELECT code, id FROM regions WHERE region_type='metro'")
            region = dict(cur.fetchall())

            cur.execute(
                "SELECT o.indicator_id, o.region_id, o.obs_date, o.value, o.revision "
                "FROM observations o WHERE o.indicator_id = ANY(%s) AND o.revision=0",
                (list(ids.values()),))
            rev0 = {(i, r, d): v for i, r, d, v, _ in cur.fetchall()}
            cur.execute(
                "SELECT indicator_id, region_id, obs_date, MAX(revision) FROM observations "
                "WHERE indicator_id = ANY(%s) GROUP BY 1,2,3", (list(ids.values()),))
            maxrev = {(i, r, d): mr for i, r, d, mr in cur.fetchall()}

            release = dt.date.today()
            ins = rev = skip = 0
            for area, ss, od, val in stream_series(START_YEAR):
                rid = region.get(area)
                if not rid:
                    continue           # SM also carries statewide + metro divisions
                iid = ids[ss]
                key = (iid, rid, od)
                prev = rev0.get(key)
                if prev is None:
                    cur.execute(
                        "INSERT INTO observations(indicator_id,region_id,obs_date,value,revision,release_date)"
                        " VALUES(%s,%s,%s,%s,0,%s) ON CONFLICT DO NOTHING",
                        (iid, rid, od, val, release)); ins += 1
                elif float(prev) != val:
                    nr = (maxrev.get(key) or 0) + 1
                    cur.execute(
                        "INSERT INTO observations(indicator_id,region_id,obs_date,value,revision,release_date)"
                        " VALUES(%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
                        (iid, rid, od, val, nr, release)); rev += 1
                else:
                    skip += 1
            print(f"Metro industries — inserted {ins:,}, revised {rev:,}, unchanged {skip:,}")

            # The analytics MV is large; CONCURRENTLY diffs the whole table and can
            # exceed the statement timeout. A plain refresh rebuilds faster.
            cur.execute("SET LOCAL statement_timeout = '900s';")
            cur.execute("REFRESH MATERIALIZED VIEW mv_indicator_analytics;")
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
