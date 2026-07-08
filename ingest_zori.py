#!/usr/bin/env python3
"""
Cignal System — ZORI ingestion (ZIP + Metro), vintage-aware.
Schema-aligned to the live Cignal DB: observations(obs_date, value, revision int,
release_date) + region_id FK. First print = revision 0; revisions increment.

Runs unattended (monthly GitHub Action). Each run:
  1. Downloads current ZORI CSVs from Zillow's static store.
  2. Melts wide -> long (region/month). Metro is filtered to MSAs only.
  3. Upserts regions, then inserts observations with insert-if-changed:
       first sighting -> revision 0 (first print, kept forever);
       changed value  -> next revision; unchanged -> skipped.
  4. Refreshes mv_indicator_analytics so analytics are current.

Env:  SUPABASE_DB_URL   (Session pooler URI)
Deps: pip install pandas psycopg2-binary requests
"""
import io, os, sys, datetime as dt
import requests, pandas as pd, psycopg2
from psycopg2.extras import execute_values

ZORI_BASE = "https://files.zillowstatic.com/research/public_csvs/zori"
ZORDI_BASE = "https://files.zillowstatic.com/research/public_csvs/zordi"
SERIES = [
    {"slug": "zori_zip", "region_type": "zip", "region_filter": None,
     "name": "Zillow Observed Rent Index — ZIP (SFR+Condo+MF, smoothed, SA)",
     "source_series": "Zip_zori_uc_sfrcondomfr_sm_sa_month",
     "url": f"{ZORI_BASE}/Zip_zori_uc_sfrcondomfr_sm_sa_month.csv"},
    {"slug": "zori_metro", "region_type": "metro", "region_filter": "msa",
     "name": "Zillow Observed Rent Index — Metro (SFR+Condo+MF, smoothed, SA)",
     "source_series": "Metro_zori_uc_sfrcondomfr_sm_sa_month",
     "url": f"{ZORI_BASE}/Metro_zori_uc_sfrcondomfr_sm_sa_month.csv"},
    {"slug": "zori_national", "region_type": "national", "region_filter": "country", "code_override": "US",
     "name": "Zillow Observed Rent Index — National (SFR+Condo+MF, smoothed, SA)",
     "source_series": "Metro_zori_uc_sfrcondomfr_sm_sa_month[US]",
     "url": f"{ZORI_BASE}/Metro_zori_uc_sfrcondomfr_sm_sa_month.csv"},
    {"slug": "zori_metro_mf", "region_type": "metro", "region_filter": "msa",
     "name": "Zillow Observed Rent Index — Metro (Multifamily, smoothed, SA)",
     "source_series": "Metro_zori_uc_mfr_sm_sa_month",
     "url": f"{ZORI_BASE}/Metro_zori_uc_mfr_sm_sa_month.csv"},
    {"slug": "zori_national_mf", "region_type": "national", "region_filter": "country", "code_override": "US",
     "name": "Zillow Observed Rent Index — National (Multifamily, smoothed, SA)",
     "source_series": "Metro_zori_uc_mfr_sm_sa_month[US]",
     "url": f"{ZORI_BASE}/Metro_zori_uc_mfr_sm_sa_month.csv"},
    {"slug": "zori_city", "region_type": "city", "region_filter": "city", "code_with_state": True,
     "name": "Zillow Observed Rent Index — City (SFR+Condo+MF, smoothed, SA)",
     "source_series": "City_zori_uc_sfrcondomfr_sm_sa_month",
     "url": f"{ZORI_BASE}/City_zori_uc_sfrcondomfr_sm_sa_month.csv"},
    {"slug": "zori_county", "region_type": "county", "region_filter": "county", "code_with_state": True,
     "name": "Zillow Observed Rent Index — County (SFR+Condo+MF, smoothed, SA)",
     "source_series": "County_zori_uc_sfrcondomfr_sm_sa_month",
     "url": f"{ZORI_BASE}/County_zori_uc_sfrcondomfr_sm_sa_month.csv"},
    # --- ZORDI: rental-market TIGHTNESS index, multifamily cut ---------------------
    # Zillow describes ZORDI as a tightness gauge, not pure demand: engagement with
    # listings relative to available supply. Higher = tighter. Empirically COINCIDENT
    # with vacancy (corr -0.90 on YoY) and ~1 month ahead of time-on-market, so it is
    # classified coincident and deliberately kept OUT of the Tell's leading composite
    # (it is near-collinear with rental_vacancy on the lagging side and would
    # double-count across the divide). Directional index — read trend, not level.
    # Note: ZORDI filenames have no "_sm" segment, unlike ZORI.
    {"slug": "zordi_metro", "region_type": "metro", "region_filter": "msa",
     "name": "Renter Demand Index (ZORDI) — Metro (Multifamily)",
     "source_series": "Metro_zordi_uc_mfr_month",
     "units": "index", "classification": "coincident", "higher_is_better": True,
     "url": f"{ZORDI_BASE}/Metro_zordi_uc_mfr_month.csv"},
    {"slug": "zordi", "region_type": "national", "region_filter": "country", "code_override": "US",
     "name": "Renter Demand Index (ZORDI)",
     "source_series": "Metro_zordi_uc_mfr_month",
     "units": "index", "classification": "coincident", "higher_is_better": True,
     "url": f"{ZORDI_BASE}/Metro_zordi_uc_mfr_month.csv"},
]
ID_COLS = ["RegionID","SizeRank","RegionName","RegionType","StateName","State","City","Metro","CountyName","StateCodeFIPS","MunicipalCodeFIPS"]


def download_and_melt(url, region_filter=None, code_override=None, code_with_state=False):
    r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=180)
    r.raise_for_status()
    df = pd.read_csv(io.StringIO(r.text))
    if region_filter and "RegionType" in df.columns:           # e.g. metro -> 'msa' only (drop national row)
        df = df[df["RegionType"] == region_filter]
    if code_with_state and "State" in df.columns:              # city/county: disambiguate by state -> "Name, ST"
        df = df.assign(_code=df["RegionName"].astype(str) + ", " + df["State"].astype(str))
    else:
        df = df.assign(_code=df["RegionName"].astype(str))
    months = [c for c in df.columns if c not in ID_COLS and c != "_code"]
    long = df.melt(id_vars=["RegionID", "_code"], value_vars=months,
                   var_name="obs_date", value_name="value").dropna(subset=["value"])
    long["obs_date"]  = pd.to_datetime(long["obs_date"]).dt.date
    long["zillow_id"] = long["RegionID"].astype("int64")
    long["code"]      = long["_code"].astype(str)
    if code_override:                                          # national row -> match the existing US region
        long["code"] = code_override
    print(f"  -> {len(long):,} obs ({long['obs_date'].min()}..{long['obs_date'].max()}), "
          f"{long['zillow_id'].nunique():,} regions")
    return long[["zillow_id", "code", "obs_date", "value"]]


def ensure_indicator(cur, s):
    cur.execute("SELECT id FROM indicators WHERE slug = %s", (s["slug"],))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute(
        """INSERT INTO indicators (slug, name, source, source_series, frequency, units,
                                   classification, higher_is_better, is_public)
           VALUES (%s,%s,%s,%s,%s,%s,%s::public.indicator_class,%s,%s) RETURNING id""",
        (s["slug"], s["name"], "Zillow Research", s["source_series"], "monthly",
         s.get("units", "USD"), s.get("classification", "trailing"),
         s.get("higher_is_better"), True),
    )
    new_id = cur.fetchone()[0]
    print(f"  created indicator {s['slug']} (id={new_id})")
    return new_id


def upsert_regions(cur, region_type, long):
    regions = long[["zillow_id", "code"]].drop_duplicates()
    execute_values(cur,
        "INSERT INTO regions (region_type, zillow_id, code, name) VALUES %s "
        "ON CONFLICT (region_type, code) DO NOTHING",
        [(region_type, int(z), c, c) for z, c in regions.itertuples(index=False)])
    print(f"  regions upserted ({len(regions):,} distinct)")


def load_series(cur, indicator_id, region_type, long, release):
    # fresh staging table each series (we commit once at the end, so drop-first
    # avoids a name collision between series within the same transaction)
    cur.execute("DROP TABLE IF EXISTS _stage;")
    cur.execute("CREATE TEMP TABLE _stage (zillow_id bigint, obs_date date, value numeric);")
    buf = io.StringIO()
    long.to_csv(buf, index=False, header=False, columns=["zillow_id", "obs_date", "value"])
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
                long = download_and_melt(s["url"], s.get("region_filter"), s.get("code_override"), s.get("code_with_state", False))
                ind  = ensure_indicator(cur, s)
                upsert_regions(cur, s["region_type"], long)
                n = load_series(cur, ind, s["region_type"], long, release)
                print(f"  inserted {n:,} rows (first prints + revisions; unchanged skipped)")
        conn.commit(); print("\nDone. Committed.")
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("REFRESH MATERIALIZED VIEW public.mv_indicator_analytics;")
        print("Refreshed mv_indicator_analytics.")
    except Exception:
        conn.rollback(); print("\nRolled back — no partial writes."); raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
