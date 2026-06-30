#!/usr/bin/env python3
"""
Cignal System — BEA Regional ingestion (source_series-driven, multi-grain).

Driven entirely by each indicator's `source_series`, encoded as TABLE-LINE
against BEA's Regional dataset. Grain is inferred from the BEA table-family
prefix, which is semantically meaningful in BEA's taxonomy:

  MA* tables (Metro Area)  -> GeoFips='MSA',    matched to regions.code (CBSA)
  CA* tables (County Area) -> GeoFips='COUNTY', matched to regions.fips (FIPS)

To add a new BEA series, register an indicator row with source='BEA' and
source_series='<TABLE>-<LINE>' — no code change required.

In use:
  MARPP-1  -> bea_rpp_all   (RPPs: All items, index US=100)        metro, annual
  MARPP-3  -> bea_rpp_rents (RPPs: Services: Rents, index US=100)  metro, annual
  CAGDP9-1 -> gdp_county    (Real GDP, all-industry, chained 2017$) county, annual

Note: BEA discontinued metro/CSA/division GDP in its Feb 2026 release, so real
GDP is now carried at county grain (the finest official level) via CAGDP9.

Revision model: revision 0 = first print, never overwritten; a changed value
for an existing (indicator, region, date) gets the next revision number.

Env:  BEA_API_KEY, SUPABASE_DB_URL
Deps: pip install psycopg2-binary requests
"""
import os, sys, datetime as dt
import requests, psycopg2

BASE = "https://apps.bea.gov/api/data"


def bea_fetch(key, table, line, geo):
    """Return list of (geofips, year, value) for one Regional TABLE/LINE at a GeoFips scope."""
    params = {
        "UserID": key, "method": "GetData", "datasetname": "Regional",
        "TableName": table, "LineCode": line, "GeoFips": geo,
        "Year": "ALL", "ResultFormat": "JSON",
    }
    try:
        r = requests.get(BASE, params=params, timeout=180)
        res = r.json().get("BEAAPI", {}).get("Results", {})
    except Exception as e:
        print(f"  {table}-{line}: request failed ({e})")
        return []
    if isinstance(res, list):
        res = res[0] if res else {}
    if not isinstance(res, dict) or "Error" in res:
        print(f"  {table}-{line}: API error {res.get('Error') if isinstance(res, dict) else res}")
        return []
    out = []
    for row in res.get("Data", []):
        v = str(row.get("DataValue", "")).replace(",", "").strip()
        try:
            fv = float(v)
        except ValueError:
            continue  # (NA)/(D)/(L) suppressed cells
        out.append((row["GeoFips"], row["TimePeriod"], fv))
    return out


def main():
    key = os.environ.get("BEA_API_KEY")
    db = os.environ.get("SUPABASE_DB_URL")
    if not key or not db:
        sys.exit("ERROR: BEA_API_KEY and SUPABASE_DB_URL must both be set")
    release = dt.date.today()
    conn = psycopg2.connect(db); conn.autocommit = False
    try:
        with conn.cursor() as cur:
            # metro key = 5-digit CBSA code; county key = 5-digit FIPS
            cur.execute("SELECT code, id FROM regions WHERE region_type='metro' AND code ~ '^[0-9]{5}$'")
            metro_rid = {c: i for c, i in cur.fetchall()}
            cur.execute("SELECT fips, id FROM regions WHERE region_type='county' AND fips IS NOT NULL")
            county_rid = {f: i for f, i in cur.fetchall()}
            cur.execute("SELECT slug, id, source_series FROM indicators "
                        "WHERE source='BEA' AND source_series ~ '^[A-Z0-9]+-[0-9]+$'")
            series = cur.fetchall()

            total_ins = total_skip = total_miss = 0
            for slug, iid, src in series:
                table, line = src.split("-", 1)
                # County-Area tables -> COUNTY/FIPS; Metro-Area (and others) -> MSA/CBSA
                if table.startswith("CA"):
                    geo, rmap = "COUNTY", county_rid
                else:
                    geo, rmap = "MSA", metro_rid
                rows = bea_fetch(key, table, line, geo)
                if not rows:
                    print(f"  {slug} ({src}): no data returned")
                    continue
                ins = skip = miss = 0
                for geofips, year, val in rows:
                    rid = rmap.get(geofips)
                    if not rid:
                        miss += 1
                        continue
                    od = f"{year}-12-31"
                    cur.execute("SELECT value, revision FROM observations "
                                "WHERE indicator_id=%s AND region_id=%s AND obs_date=%s "
                                "ORDER BY revision DESC LIMIT 1", (iid, rid, od))
                    prev = cur.fetchone()
                    if prev is None:
                        cur.execute("INSERT INTO observations"
                                    "(indicator_id,region_id,obs_date,value,revision,release_date)"
                                    " VALUES(%s,%s,%s,%s,0,%s)", (iid, rid, od, val, release)); ins += 1
                    elif float(prev[0]) != float(val):
                        cur.execute("INSERT INTO observations"
                                    "(indicator_id,region_id,obs_date,value,revision,release_date)"
                                    " VALUES(%s,%s,%s,%s,%s,%s)",
                                    (iid, rid, od, val, prev[1] + 1, release)); ins += 1
                    else:
                        skip += 1
                print(f"  {slug} ({src}, {geo}): inserted {ins}, unchanged {skip}, unmatched {miss}")
                total_ins += ins; total_skip += skip; total_miss += miss
            print(f"BEA total: inserted {total_ins}, unchanged {total_skip}, unmatched {total_miss}")
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_indicator_analytics;")
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
