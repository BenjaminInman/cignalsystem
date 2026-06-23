#!/usr/bin/env python3
"""
Cignal System — BEA ingestion (Regional Price Parities by metro).

BEA's API only serves MSA-level data through its MA-prefixed tables; the CA/SA
income tables are county/state only. The metro-level signal we want is MARPP
(Regional Price Parities by MSA), an index where US = 100:

  LineCode 1 -> bea_rpp_all   (RPPs: All items)      overall metro price level
  LineCode 3 -> bea_rpp_rents (RPPs: Services: Rents) metro rent price level

Both attach to the Census CBSA metro regions (regions.region_type='metro',
numeric code = CBSA = BEA GeoFips), on the standard revision model. RPP is an
annual series (obs_date = YYYY-12-31) refreshed by BEA roughly once a year, so
this runs annually and no-ops on unchanged values.

Env:  BEA_API_KEY, SUPABASE_DB_URL
Deps: pip install psycopg2-binary requests
"""
import os, sys, datetime as dt
import requests, psycopg2

BASE = "https://apps.bea.gov/api/data"
LINES = {"1": "bea_rpp_all", "3": "bea_rpp_rents"}


def bea_msa(key, line):
    """Return list of (geofips, year, value) for one MARPP line, all MSAs/years."""
    params = {
        "UserID": key, "method": "GetData", "datasetname": "Regional",
        "TableName": "MARPP", "LineCode": line, "GeoFips": "MSA",
        "Year": "ALL", "ResultFormat": "JSON",
    }
    try:
        r = requests.get(BASE, params=params, timeout=120)
        res = r.json().get("BEAAPI", {}).get("Results", {})
    except Exception as e:
        print(f"  line {line}: request failed ({e})")
        return []
    if not isinstance(res, dict) or "Error" in res:
        print(f"  line {line}: API error {res.get('Error') if isinstance(res, dict) else res}")
        return []
    out = []
    for row in res.get("Data", []):
        v = str(row.get("DataValue", "")).replace(",", "").strip()
        try:
            fv = float(v)
        except ValueError:
            continue
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
            cur.execute("SELECT slug, id FROM indicators WHERE source='BEA'")
            ind = {s: i for s, i in cur.fetchall()}

            ins = skip = miss = 0
            for line, slug in LINES.items():
                iid = ind.get(slug)
                if not iid:
                    print(f"  indicator {slug} not registered; skipping")
                    continue
                for geofips, year, val in bea_msa(key, line):
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
            print(f"BEA RPP: inserted {ins}, unchanged {skip}, unmatched MSAs {miss}")
            cur.execute("REFRESH MATERIALIZED VIEW mv_indicator_analytics;")
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
