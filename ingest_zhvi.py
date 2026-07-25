#!/usr/bin/env python3
"""
Cignal System — ZHVI ingestion (Zillow Home Value Index), vintage-aware.
Mirrors ingest_zori.py: insert-if-changed (revision 0 = first print), then
refresh mv_indicator_analytics.

Two series from the same source CSV:
  zhvi_metro     — every MSA row (region_filter='msa')
  zhvi_national  — the single 'country' row, matched to the existing US region
                   via code_override='US' (region.zillow_id 102001 == RegionID)

The national row was previously dropped by a hardcoded RegionType=='msa' filter,
so zhvi_national existed but silently stopped updating. Metros key to the same
Zillow regions as ZORI via zillow_id (RegionID), so no separate geography setup
is needed.

Env:  SUPABASE_DB_URL   (Session pooler URI)
Deps: pip install pandas psycopg2-binary requests
"""
import io, os, sys, datetime as dt
import requests, pandas as pd, psycopg2
from psycopg2.extras import execute_values

ZHVI_URL = ("https://files.zillowstatic.com/research/public_csvs/zhvi/"
            "Metro_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv")

SERIES = [
    {"slug": "zhvi_metro", "region_type": "metro", "region_filter": "msa",
     "code_override": None,
     "name": "Zillow Home Value Index — Metro (All Homes, smoothed, SA)",
     "source_series": "Metro_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month"},
    {"slug": "zhvi_national", "region_type": "national", "region_filter": "country",
     "code_override": "US",
     "name": "Zillow Home Value Index — National (All Homes, smoothed, SA)",
     "source_series": "Metro_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month[US]"},
]
ID_COLS = ["RegionID", "SizeRank", "RegionName", "RegionType", "StateName"]


def download_and_melt(df, region_filter=None, code_override=None):
    d = df
    if region_filter and "RegionType" in d.columns:      # 'msa' metros, or 'country' national row
        d = d[d["RegionType"] == region_filter]
    d = d.assign(_code=d["RegionName"].astype(str))
    months = [c for c in d.columns if c not in ID_COLS and c != "_code"]
    long = d.melt(id_vars=["RegionID", "_code"], value_vars=months,
                  var_name="obs_date", value_name="value").dropna(subset=["value"])
    long["obs_date"] = pd.to_datetime(long["obs_date"]).dt.date
    long["zillow_id"] = long["RegionID"].astype("int64")
    if code_override:                                    # national row -> match existing US region
        long["code"] = code_override
    else:
        long["code"] = long["_code"].astype(str)
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
        (s["slug"], s["name"], "Zillow Research", s["source_series"], "monthly", "USD",
         "trailing", None, True))
    return cur.fetchone()[0]


def upsert_regions(cur, long, region_type):
    regs = long[["zillow_id", "code"]].drop_duplicates()
    execute_values(cur,
        "INSERT INTO regions (region_type, zillow_id, code, name) VALUES %s "
        "ON CONFLICT (region_type, code) DO NOTHING",
        [(region_type, int(z), c, c) for z, c in regs.itertuples(index=False)])


def load_series(cur, ind, long, region_type, release):
    cur.execute("DROP TABLE IF EXISTS _stage;")
    cur.execute("CREATE TEMP TABLE _stage (zillow_id bigint, obs_date date, value numeric);")
    buf = io.StringIO()
    long.to_csv(buf, index=False, header=False, columns=["zillow_id", "obs_date", "value"])
    buf.seek(0)
    cur.copy_expert("COPY _stage (zillow_id, obs_date, value) FROM STDIN WITH CSV", buf)
    cur.execute("""
        INSERT INTO observations (indicator_id, region_id, obs_date, value, revision, release_date)
        SELECT %(ind)s, r.id, s.obs_date, s.value,
               COALESCE(latest.revision + 1, 0), %(release)s
        FROM _stage s
        JOIN regions r ON r.region_type = %(rt)s AND r.zillow_id = s.zillow_id
        LEFT JOIN LATERAL (
            SELECT o.value, o.revision FROM observations o
            WHERE o.indicator_id = %(ind)s AND o.region_id = r.id AND o.obs_date = s.obs_date
            ORDER BY o.revision DESC LIMIT 1
        ) latest ON true
        WHERE latest.value IS DISTINCT FROM s.value;
    """, {"ind": ind, "release": release, "rt": region_type})
    return cur.rowcount


def main():
    db = os.environ.get("SUPABASE_DB_URL")
    if not db:
        sys.exit("ERROR: SUPABASE_DB_URL not set")
    release = dt.date.today()
    print(f"ZHVI ingestion — release_date {release}")
    r = requests.get(ZHVI_URL, headers={"User-Agent": "Mozilla/5.0"}, timeout=180)
    r.raise_for_status()
    raw = pd.read_csv(io.StringIO(r.text))

    conn = psycopg2.connect(db); conn.autocommit = False
    try:
        with conn.cursor() as cur:
            for s in SERIES:
                print(f"\n[{s['slug']}]")
                long = download_and_melt(raw, s.get("region_filter"), s.get("code_override"))
                ind = ensure_indicator(cur, s)
                upsert_regions(cur, long, s["region_type"])
                n = load_series(cur, ind, long, s["region_type"], release)
                print(f"  inserted {n:,} rows (first prints + revisions; unchanged skipped)")
        conn.commit(); print("\nDone. Committed.")
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("SET statement_timeout = 0")
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_indicator_analytics;")
        print("Refreshed mv_indicator_analytics.")
    except Exception:
        conn.rollback(); print("\nRolled back — no partial writes."); raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
