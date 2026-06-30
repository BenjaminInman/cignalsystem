#!/usr/bin/env python3
"""
Cignal System — BEA Regional ingestion (source_series-driven).

Generalized from the original RPP-only loader to be driven entirely by each
indicator's `source_series`, encoded as TABLE-LINE against BEA's Regional
dataset at MSA grain (GeoFips='MSA'). Mirrors the FRED ingest pattern: to add a
new BEA metro series, register an indicator row with source='BEA' and
source_series='<TABLE>-<LINE>' — no code change required.

Currently in use:
  MARPP-1  -> bea_rpp_all   (RPPs: All items, index US=100)        annual
  MARPP-3  -> bea_rpp_rents (RPPs: Services: Rents, index US=100)  annual
  MAGDP9-1 -> gdp_metro     (Real GDP, all-industry, chained $k)   annual

All series attach to Census CBSA metro regions (regions.region_type='metro',
numeric 5-digit code = CBSA = BEA GeoFips), on the standard revision model
(revision 0 = first print, never overwritten; changed values get next revision).

Env:  BEA_API_KEY, SUPABASE_DB_URL
Deps: pip install psycopg2-binary requests
"""
import os, sys, datetime as dt
import requests, psycopg2

BASE = "https://apps.bea.gov/api/data"


def bea_msa(key, table, line):
    """Return list of (geofips, year, value) for one Regional TABLE/LINE, all MSAs/years."""
    params = {
        "UserID": key, "method": "GetData", "datasetname": "Regional",
        "TableName": table, "LineCode": line, "GeoFips": "MSA",
        "Year": "ALL", "ResultFormat": "JSON",
    }
    try:
        r = requests.get(BASE, params=params, timeout=120)
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
            continue  # (NA), (D), (L) suppressed cells
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
            cur.execute("SELECT code, id FROM regions "
                        "WHERE region_type='metro' AND code ~ '^[0-9]{5}$'")
            cbsa_rid = {c: i for c, i in cur.fetchall()}
            cur.execute("SELECT slug, id, source_series FROM indicators "
                        "WHERE source='BEA' AND source_series ~ '^[A-Z0-9]+-[0-9]+$'")
            series = cur.fetchall()  # (slug, id, 'TABLE-LINE')

            total_ins = total_skip = total_miss = 0
            for slug, iid, src in series:
                table, line = src.split("-", 1)
                rows = bea_msa(key, table, line)
                if not rows:
                    print(f"  {slug} ({src}): no data returned")
                    continue
                ins = skip = miss = 0
                for geofips, year, val in rows:
                    rid = cbsa_rid.get(geofips)
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
                print(f"  {slug} ({src}): inserted {ins}, unchanged {skip}, unmatched {miss}")
                total_ins += ins; total_skip += skip; total_miss += miss
            print(f"BEA total: inserted {total_ins}, unchanged {total_skip}, unmatched {total_miss}")
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_indicator_analytics;")
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
