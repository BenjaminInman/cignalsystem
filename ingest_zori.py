#!/usr/bin/env python3
"""
Cignal System — ZORI ingestion (ZIP + Metro), vintage-aware.
Schema-aligned to the LIVE Cignal DB (read 2026-06): observations uses
obs_date / value / revision(int) / release_date, and a region_id FK added by
001_add_geography.sql. First print = revision 0; revisions increment.

Runs unattended on a schedule. Each run:
  1. Downloads current ZORI CSVs from Zillow's static store (verified live URLs).
  2. Melts wide (one col per month) -> long (region/month rows).
  3. Upserts regions, then inserts into observations with insert-if-changed:
       - first time a (indicator, region, obs_date) is seen -> revision 0 (first print, kept forever)
       - value changed vs latest revision -> new row at revision+1 (a revision)
       - value unchanged -> skipped (monthly reruns stay cheap)
ZORI rewrites its full history monthly; this never updates/deletes, so
MIN(revision)=0 is always the first print that v_indicator_analytics reads.

Env:  SUPABASE_DB_URL   (Project Settings -> Database -> Connection string / URI)
Deps: pip install pandas psycopg2-binary requests
"""

import io, os, sys, datetime as dt
import requests, pandas as pd, psycopg2
from psycopg2.extras import execute_values

ZORI_BASE = "https://files.zillowstatic.com/research/public_csvs/zori"
# sfrcondomfr = SFR+Condo+Multifamily (multifamily-INCLUSIVE); sm_sa = smoothed, seasonally adjusted
SERIES = [
    {"slug": "zori_zip",   "region_type": "zip",
     "name": "Zillow Observed Rent Index — ZIP (SFR+Condo+MF, smoothed, SA)",
     "source_series": "Zip_zori_uc_sfrcondomfr_sm_sa_month",
     "url": f"{ZORI_BASE}/Zip_zori_uc_sfrcondomfr_sm_sa_month.csv"},
    {"slug": "zori_metro", "region_type": "metro",
     "name": "Zillow Observed Rent Index — Metro (SFR+Condo+MF, smoothed, SA)",
     "source_series": "Metro_zori_uc_sfrcondomfr_sm_sa_month",
     "url": f"{ZORI_BASE}/Metro_zori_uc_sfrcondomfr_sm_sa_month.csv"},
]
ID_COLS = ["RegionID","SizeRank","RegionName","RegionType","StateName","State","City","Metro","CountyName"]


def download_and_melt(url):
    print(f"  downloading {url}")
    r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=180)
    r.raise_for_status()
    df = pd.read_csv(io.StringIO(r.text))
    months = [c for c in df.columns if c not in ID_COLS]
    long = df.melt(id_vars=["RegionID","RegionName"], value_vars=months,
                   var_name="obs_date", value_name="value").dropna(subset=["value"])
    long["obs_date"]  = pd.to_datetime(long["obs_date"]).dt.date
    long["zillow_id"] = long["RegionID"].astype("int64")
    long["code"]      = long["RegionName"].astype(str)
    print(f"  -> {len(long):,} obs ({long['obs_date'].min()}..{long['obs_date'].max()}), "
          f"{long['zillow_id'].nunique():,} regions")
    return long[["zillow_id","code","obs_date","value"]]


def ensure_indicator(cur, s):
    cur.execute("SELECT id FROM indicators WHERE slug = %s", (s["slug"],))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute(
        """INSERT INTO indicators (slug, name, source, source_series, frequency, units,
                                   classification, higher_is_better, is_public)
           VALUES (%s,%s,%s,%s,%s,%s,%s::public.indicator_class,%s,%s) RETURNING id""",
        (s["slug"], s["name"], "Zillow Research", s["source_series"], "monthly", "USD",
         "trailing", None, True),   # rent level = trailing/coincident signal
    )
    new_id = cur.fetchone()[0]
    print(f"  created indicator {s['slug']} (id={new_id})")
    return new_id


def upsert_regions(cur, region_type, long):
    regions = long[["zillow_id","code"]].drop_duplicates()
    execute_values(cur,
        "INSERT INTO regions (region_type, zillow_id, code, name) VALUES %s "
        "ON CONFLICT (region_type, code) DO NOTHING",
        [(region_type, int(z), c, c) for z, c in regions.itertuples(index=False)])
    print(f"  regions upserted ({len(regions):,} distinct)")


def load_series(cur, indicator_id, region_type, long, release):
    cur.execute("CREATE TEMP TABLE _stage (zillow_id bigint, obs_date date, value numeric) ON COMMIT DROP;")
    buf = io.StringIO()
    long.to_csv(buf, index=False, header=False, columns=["zillow_id","obs_date","value"])
    buf.seek(0)
    cur.copy_expert("COPY _stage (zillow_id, obs_date, value) FROM STDIN WITH CSV", buf)

    cur.execute("""
        INSERT INTO observations (indicator_id, region_id, obs_date, value, revision, release_date)
        SELECT %(ind)s, r.id, s.obs_date, s.value,
               COALESCE(latest.revision + 1, 0) AS revision,
               %(release)s
        FROM _stage s
        JOIN regions r ON r.region_type = %(rtype)s AND r.zillow_id = s.zillow_id
        LEFT JOIN LATERAL (
            SELECT o.value, o.revision
            FROM observations o
            WHERE o.indicator_id = %(ind)s AND o.region_id = r.id AND o.obs_date = s.obs_date
            ORDER BY o.revision DESC LIMIT 1
        ) latest ON true
        WHERE latest.value IS DISTINCT FROM s.value;
    """, {"ind": indicator_id, "rtype": region_type, "release": release})
    return cur.rowcount


def main():
    db_url = os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        sys.exit("ERROR: SUPABASE_DB_URL not set")
    release = dt.date.today()
    print(f"ZORI ingestion — release_date {release}")
    conn = psycopg2.connect(db_url); conn.autocommit = False
    try:
        with conn.cursor() as cur:
            for s in SERIES:
                print(f"\n[{s['slug']}]")
                long = download_and_melt(s["url"])
                ind  = ensure_indicator(cur, s)
                upsert_regions(cur, s["region_type"], long)
                n = load_series(cur, ind, s["region_type"], long, release)
                print(f"  inserted {n:,} rows (first prints + revisions; unchanged skipped)")
        conn.commit(); print("\nDone. Committed.")
        # refresh analytics outside the txn (CONCURRENTLY can't run in a transaction
        # and needs mv_indicator_analytics' unique index)
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_indicator_analytics;")
        print("Refreshed mv_indicator_analytics.")
    except Exception:
        conn.rollback(); print("\nRolled back — no partial writes."); raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
