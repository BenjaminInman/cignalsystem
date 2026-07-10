#!/usr/bin/env python3
"""
Cignal System — U.S. Census ACS ingestion (multifamily variables).

Loads American Community Survey 5-year estimates into the observations table on
the same first-print/revision model as the FRED and ZORI pipelines. ACS is an
annual product (a new 5-year vintage publishes each December), so this runs on a
monthly cron that no-ops until a new vintage appears.

Composite acs_mf_units_5plus = B25024 (5-9 + 10-19 + 20-49 + 50+ units).
Geography: national today; states / metros (CBSA) / ZCTAs extend via GEO_LEVELS.

Env:  CENSUS_API_KEY, SUPABASE_DB_URL (Session pooler URI)
Deps: pip install psycopg2-binary requests
"""
import os, sys, datetime as dt
import requests, psycopg2

ACS_VAR_SLUG = {
    "B25064_001E": "acs_median_gross_rent",
    "B25058_001E": "acs_median_contract_rent",
    "B19013_001E": "acs_median_hh_income",
    "B25071_001E": "acs_rent_burden",
    "B25003_003E": "acs_renter_occupied",
    "B25003_001E": "acs_occupied_units",
    "B25024_001E": "acs_housing_units",
    "B25077_001E": "acs_median_home_value",
}
MF_PARTS = ["B25024_007E", "B25024_008E", "B25024_009E", "B25024_010E"]  # -> acs_mf_units_5plus
ALL_VARS = list(ACS_VAR_SLUG) + MF_PARTS
START_YEAR = 2010

# Geography levels to ingest.
#   single -> one fixed region (national).
#   multi  -> many regions resolved by code (metros via CBSA; ZCTAs later via ZIP).
GEO_LEVELS = [
    {"kind": "single", "clause": {"for": "us:1"}, "region": ("national", "US")},
    {"kind": "multi", "clause": {"for": "metropolitan statistical area/micropolitan statistical area:*"},
     "geo_col": "metropolitan statistical area/micropolitan statistical area",
     "region_type": "metro", "name_filter": "Metro Area"},
]


def fetch(year, key, geo_clause):
    params = {"get": "NAME," + ",".join(ALL_VARS), "key": key}
    params.update(geo_clause)
    try:
        r = requests.get(f"https://api.census.gov/data/{year}/acs/acs5", params=params, timeout=60)
        return r.json() if r.status_code == 200 else None
    except Exception:
        return None


def num(v):
    try:
        f = float(v)
        return None if f <= -1e6 else f   # Census uses large negative sentinels for suppressed
    except (TypeError, ValueError):
        return None


def main():
    key = os.environ.get("CENSUS_API_KEY")
    db = os.environ.get("SUPABASE_DB_URL")
    if not key or not db:
        sys.exit("ERROR: CENSUS_API_KEY and SUPABASE_DB_URL must both be set")
    release = dt.date.today()
    end_year = release.year - 1
    conn = psycopg2.connect(db); conn.autocommit = False
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT slug, id FROM indicators WHERE source='Census ACS'")
            slug_id = {s: i for s, i in cur.fetchall()}
            ins = skip = 0
            for level in GEO_LEVELS:
                # Resolve region(s) for this level.
                if level["kind"] == "single":
                    rt, code = level["region"]
                    cur.execute("SELECT id FROM regions WHERE region_type=%s AND code=%s", (rt, code))
                    row = cur.fetchone()
                    if not row:
                        print(f"  region {rt}/{code} not found — skipping"); continue
                    region_lookup = {None: row[0]}      # single bucket
                else:
                    cur.execute("SELECT code, id FROM regions WHERE region_type=%s AND code ~ '^[0-9]+$'",
                                (level["region_type"],))
                    region_lookup = {c: i for c, i in cur.fetchall()}

                for year in range(START_YEAR, end_year + 1):
                    data = fetch(year, key, level["clause"])
                    if not data or len(data) < 2:
                        continue
                    hdr = data[0]
                    gi = hdr.index(level["geo_col"]) if level["kind"] == "multi" else None
                    obs_date = f"{year}-12-31"
                    for rec in data[1:]:
                        d = dict(zip(hdr, rec))
                        if level["kind"] == "multi":
                            if level.get("name_filter") and level["name_filter"] not in d.get("NAME", ""):
                                continue
                            region_id = region_lookup.get(rec[gi])
                        else:
                            region_id = region_lookup[None]
                        if not region_id:
                            continue
                        points = {slug: num(d.get(var)) for var, slug in ACS_VAR_SLUG.items()}
                        mf = sum(filter(None, [num(d.get(c)) for c in MF_PARTS]))
                        points["acs_mf_units_5plus"] = mf or None
                        for slug, val in points.items():
                            if val is None or slug not in slug_id:
                                continue
                            iid = slug_id[slug]
                            cur.execute(
                                "SELECT value, revision FROM observations WHERE indicator_id=%s "
                                "AND region_id=%s AND obs_date=%s ORDER BY revision DESC LIMIT 1",
                                (iid, region_id, obs_date))
                            prev = cur.fetchone()
                            if prev is None:
                                cur.execute(
                                    "INSERT INTO observations(indicator_id,region_id,obs_date,value,revision,release_date)"
                                    " VALUES(%s,%s,%s,%s,0,%s)", (iid, region_id, obs_date, val, release)); ins += 1
                            elif float(prev[0]) != float(val):
                                cur.execute(
                                    "INSERT INTO observations(indicator_id,region_id,obs_date,value,revision,release_date)"
                                    " VALUES(%s,%s,%s,%s,%s,%s)", (iid, region_id, obs_date, val, prev[1] + 1, release)); ins += 1
                            else:
                                skip += 1
            print(f"Census ACS — inserted {ins}, unchanged {skip}")
            cur.execute("SET statement_timeout = 0")
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_indicator_analytics;")
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
