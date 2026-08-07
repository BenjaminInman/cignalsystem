#!/usr/bin/env python3
"""
Cignal System — HUD ingestion (Fair Market Rents + ZIP↔CBSA crosswalk).

Two HUD products on one token:
  1. ZIP→CBSA crosswalk (USPS, type=3) -> zip_cbsa_crosswalk, then re-derive
     regions.cbsa_code so Zillow metros formally link to Census CBSAs.
  2. Fair Market Rents (statedata) -> metro-complete (METRO{cbsa}M{cbsa}) FMRs by
     bedroom, loaded onto the Census CBSA metro regions on the revision model.

HUD updates the crosswalk quarterly and FMRs annually (effective Oct 1), so this
runs monthly and no-ops on unchanged values.

Env:  HUD_API_TOKEN, SUPABASE_DB_URL
Deps: pip install psycopg2-binary requests
"""
import os, sys, re, datetime as dt
import requests, psycopg2

BASE = "https://www.huduser.gov/hudapi/public"
STATES = ("AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT "
          "NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR").split()
BR = {"Efficiency": "fmr_studio", "One-Bedroom": "fmr_1br", "Two-Bedroom": "fmr_2br",
      "Three-Bedroom": "fmr_3br", "Four-Bedroom": "fmr_4br"}
FMR_OBS_DATE = "2025-10-01"   # FY2026 effective date; bump when a new FMR year publishes


def hud(path, token):
    try:
        r = requests.get(f"{BASE}/{path}", headers={"Authorization": f"Bearer {token}"}, timeout=60)
        return r.json() if r.status_code == 200 else None
    except Exception:
        return None


def main():
    token = os.environ.get("HUD_API_TOKEN")
    db = os.environ.get("SUPABASE_DB_URL")
    if not token or not db:
        sys.exit("ERROR: HUD_API_TOKEN and SUPABASE_DB_URL must both be set")
    release = dt.date.today()
    conn = psycopg2.connect(db); conn.autocommit = False
    try:
        with conn.cursor() as cur:
            # ---- 1. ZIP -> CBSA crosswalk ----
            xw = []
            for st in STATES:
                d = hud(f"usps?type=3&query={st}", token)
                if not d or "data" not in d:
                    continue
                yr, q = d["data"].get("year"), d["data"].get("quarter")
                for r in d["data"]["results"]:
                    xw.append((r["zip"], r["geoid"], r.get("res_ratio"), r.get("city"), r.get("state"), yr, q))
            if xw:
                # keep best (zip,cbsa) by res_ratio
                best = {}
                for row in xw:
                    k = (row[0], row[1]); rr = row[2] or 0
                    if k not in best or rr > (best[k][2] or 0):
                        best[k] = row
                cur.executemany(
                    "INSERT INTO zip_cbsa_crosswalk(zip,cbsa,res_ratio,city,state,year,quarter) "
                    "VALUES (%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (zip,cbsa) DO UPDATE SET "
                    "res_ratio=EXCLUDED.res_ratio, year=EXCLUDED.year, quarter=EXCLUDED.quarter",
                    list(best.values()))
                print(f"crosswalk: upserted {len(best)} zip-cbsa rows")

            # ---- 2. Re-derive cbsa_code links ----
            cur.execute("UPDATE regions SET cbsa_code = code WHERE region_type='metro' "
                        "AND code ~ '^[0-9]+$' AND (cbsa_code IS NULL OR cbsa_code <> code)")
            cur.execute("""
                WITH metro_zip AS (
                  SELECT zc.metro_label, x.cbsa, sum(coalesce(x.res_ratio,0)) w
                  FROM zip_crosswalk zc JOIN zip_cbsa_crosswalk x ON x.zip = zc.zip
                  WHERE zc.metro_label IS NOT NULL GROUP BY zc.metro_label, x.cbsa),
                ranked AS (
                  SELECT metro_label, cbsa, row_number() OVER (PARTITION BY metro_label ORDER BY w DESC) rn
                  FROM metro_zip)
                UPDATE regions r SET cbsa_code = ranked.cbsa FROM ranked
                WHERE ranked.rn=1 AND r.region_type='metro' AND r.zillow_id IS NOT NULL
                  AND r.code = ranked.metro_label""")

            # ---- 3. Fair Market Rents (metro-complete only) ----
            cur.execute("SELECT code, id FROM regions WHERE region_type='metro' AND code ~ '^[0-9]+$' AND retired_at IS NULL")
            cbsa_rid = {c: i for c, i in cur.fetchall()}
            cur.execute("SELECT slug, id FROM indicators WHERE source='HUD FMR'")
            fmr_ind = {s: i for s, i in cur.fetchall()}
            ins = skip = 0
            for st in STATES:
                d = hud(f"fmr/statedata/{st}", token)
                if not d or "data" not in d:
                    continue
                for m in d["data"].get("metroareas", []):
                    mm = re.match(r"METRO(\d{5})M\1$", m.get("code", ""))
                    if not mm:
                        continue
                    rid = cbsa_rid.get(mm.group(1))
                    if not rid:
                        continue
                    for br, slug in BR.items():
                        val = m.get(br)
                        if not val or slug not in fmr_ind:
                            continue
                        iid = fmr_ind[slug]
                        cur.execute("SELECT value, revision FROM observations WHERE indicator_id=%s "
                                    "AND region_id=%s AND obs_date=%s ORDER BY revision DESC LIMIT 1",
                                    (iid, rid, FMR_OBS_DATE))
                        prev = cur.fetchone()
                        if prev is None:
                            cur.execute("INSERT INTO observations(indicator_id,region_id,obs_date,value,revision,release_date)"
                                        " VALUES(%s,%s,%s,%s,0,%s)", (iid, rid, FMR_OBS_DATE, val, release)); ins += 1
                        elif float(prev[0]) != float(val):
                            cur.execute("INSERT INTO observations(indicator_id,region_id,obs_date,value,revision,release_date)"
                                        " VALUES(%s,%s,%s,%s,%s,%s)", (iid, rid, FMR_OBS_DATE, val, prev[1] + 1, release)); ins += 1
                        else:
                            skip += 1
            print(f"FMR: inserted {ins}, unchanged {skip}")
            cur.execute("SET statement_timeout = 0")
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_indicator_analytics;")
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
