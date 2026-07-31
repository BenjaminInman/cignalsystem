#!/usr/bin/env python3
"""
Cignal System - HelloData ingestion (aggregated, MF-filtered).

HelloData's Query Builder Dataset Export is async: an export is triggered with a
webhook, HelloData delivers a signed CSV URL to our Vercel receiver, and that URL
is passed into this job. This script downloads that CSV and writes it into the
warehouse using the SAME integrity rules as ZORI:
  first print -> revision 0 (kept forever); changed value -> next revision;
  unchanged -> skipped. Then mv_indicator_analytics is refreshed.

HelloData is kept as its OWN source with its own indicators - never blended with
ZORI. Multifamily-only (number_units > 49) is enforced at the export.

Modes (HD_MODE):
  zip    - CSV grouped by zip_code; joins regions on (zip, code).
  metro  - CSV grouped by msa (full CBSA name); name normalized -> CBSA code.
  roster - CSV of property_id + msa + number_units; rolls up to per-metro
           property count + unit total (coverage indicators).

Env: SUPABASE_DB_URL, HD_MODE, HD_URL, [HD_OBS_DATE=YYYY-MM-DD]
Deps: pip install pandas psycopg2-binary requests
"""
import io, os, sys, re, datetime as dt
import requests, pandas as pd, psycopg2
from psycopg2.extras import execute_values

SOURCE = "HelloData"
# slug, csv column, units, classification, higher_is_better, scale
METRICS = [
    ("hd_asking_rent",    "asking_rent",       "USD",  "coincident", True,  1.0),
    ("hd_effective_rent", "effective_rent",    "USD",  "leading",    True,  1.0),
    ("hd_concession",     "concession",        "USD",  "leading",    False, 1.0),
    ("hd_leased_pct",     "leased_percentage", "%",    "coincident", True,  100.0),
    ("hd_days_on_market", "days_on_market",    "days", "leading",    False, 1.0),
]
COVERAGE = [
    ("hd_property_count", "properties", "coincident", True),
    ("hd_unit_count",     "units",      "coincident", True),
]

def norm(s):
    s = str(s).lower().strip()
    s = re.sub(r"[-\s]+", " ", s)
    s = re.sub(r"\s*,\s*", ", ", s)
    return s

def download(url):
    r = requests.get(url, timeout=300)
    r.raise_for_status()
    return pd.read_csv(io.StringIO(r.text))

def ensure_indicator(cur, slug, name, series, units, cls, hib):
    cur.execute("SELECT id FROM indicators WHERE slug=%s", (slug,))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute(
        """INSERT INTO indicators (slug, name, source, source_series, frequency, units,
                                   classification, higher_is_better, is_public)
           VALUES (%s,%s,%s,%s,'monthly',%s,%s::public.indicator_class,%s,true) RETURNING id""",
        (slug, name, SOURCE, series, units, cls, hib))
    nid = cur.fetchone()[0]
    print(f"  created indicator {slug} (id={nid})")
    return nid

def metro_code_map(cur):
    cur.execute("SELECT code, name FROM regions WHERE region_type='metro'")
    return {norm(n): c for c, n in cur.fetchall()}

def upsert_zip_regions(cur, zips):
    execute_values(cur,
        "INSERT INTO regions (region_type, code, name) VALUES %s "
        "ON CONFLICT (region_type, code) DO NOTHING",
        [("zip", z, z) for z in zips])

def load(cur, indicator_id, region_type, rows, release):
    """rows: list of (region_code, obs_date, value). insert-if-changed on code join."""
    cur.execute("DROP TABLE IF EXISTS _hd_stage;")
    cur.execute("CREATE TEMP TABLE _hd_stage (code text, obs_date date, value numeric);")
    buf = io.StringIO()
    for code, d, v in rows:
        buf.write(f"{code},{d},{v}\n")
    buf.seek(0)
    cur.copy_expert("COPY _hd_stage (code, obs_date, value) FROM STDIN WITH CSV", buf)
    cur.execute("""
        INSERT INTO observations (indicator_id, region_id, obs_date, value, revision, release_date)
        SELECT %(ind)s, r.id, s.obs_date, s.value,
               COALESCE(latest.revision + 1, 0), %(rel)s
        FROM _hd_stage s
        JOIN regions r ON r.region_type=%(rt)s AND r.code=s.code
        LEFT JOIN LATERAL (
            SELECT o.value, o.revision FROM observations o
            WHERE o.indicator_id=%(ind)s AND o.region_id=r.id AND o.obs_date=s.obs_date
            ORDER BY o.revision DESC LIMIT 1
        ) latest ON true
        WHERE latest.value IS DISTINCT FROM s.value;
    """, {"ind": indicator_id, "rt": region_type, "rel": release})
    return cur.rowcount

def main():
    db = os.environ.get("SUPABASE_DB_URL")
    mode = os.environ.get("HD_MODE")
    url = os.environ.get("HD_URL")
    if not (db and mode and url):
        sys.exit("ERROR: need SUPABASE_DB_URL, HD_MODE, HD_URL")
    obs_date = os.environ.get("HD_OBS_DATE") or dt.date.today().isoformat()
    release = dt.date.today()
    print(f"HelloData ingestion - mode={mode} obs_date={obs_date}")
    df = download(url)
    print(f"  downloaded {len(df):,} rows; cols={list(df.columns)}")

    conn = psycopg2.connect(db); conn.autocommit = False
    try:
        with conn.cursor() as cur:
            if mode in ("zip", "metro"):
                region_type = "zip" if mode == "zip" else "metro"
                if mode == "zip":
                    df = df[df["zip_code"].notna()].copy()
                    df["_code"] = df["zip_code"].astype(str).str.split(".").str[0].str.zfill(5)
                    upsert_zip_regions(cur, sorted(df["_code"].unique()))
                    print(f"  upserted {df['_code'].nunique():,} zip regions")
                else:
                    cmap = metro_code_map(cur)
                    df["_code"] = df["msa"].map(lambda m: cmap.get(norm(m)))
                    miss = df[df["_code"].isna()]["msa"].unique()
                    if len(miss):
                        print(f"  WARN {len(miss)} metros unmatched (e.g. {list(miss)[:3]})")
                    df = df[df["_code"].notna()].copy()
                for slug, col, units, cls, hib, scale in METRICS:
                    if col not in df.columns:
                        print(f"  skip {slug}: column {col} absent"); continue
                    ind = ensure_indicator(cur, slug,
                        f"HelloData {slug.replace('hd_','').replace('_',' ').title()} (multifamily)",
                        f"querybuilder:{col}:mf50", units, cls, hib)
                    sub = df[["_code", col]].dropna(subset=[col])
                    rows = [(c, obs_date, float(v) * scale) for c, v in sub.itertuples(index=False)]
                    n = load(cur, ind, region_type, rows, release)
                    print(f"  {slug}: {len(rows):,} cells -> {n:,} written")
            elif mode == "roster":
                cmap = metro_code_map(cur)
                df = df[df["number_units"].notna()].copy()
                df["_code"] = df["msa"].map(lambda m: cmap.get(norm(m)))
                df = df[df["_code"].notna()]
                agg = df.groupby("_code").agg(properties=("property_id", "nunique"),
                                              units=("number_units", "sum")).reset_index()
                print(f"  roster: {len(agg):,} metros")
                for slug, field, cls, hib in COVERAGE:
                    ind = ensure_indicator(cur, slug,
                        f"HelloData MF {field.title()} Tracked", f"querybuilder:coverage:{field}",
                        field, cls, hib)
                    rows = [(c, obs_date, float(v)) for c, v in
                            agg[["_code", field]].itertuples(index=False)]
                    n = load(cur, ind, "metro", rows, release)
                    print(f"  {slug}: {len(rows):,} metros -> {n:,} written")
            else:
                sys.exit(f"ERROR: unknown HD_MODE {mode}")
        conn.commit(); print("Committed.")
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("SET statement_timeout = 0")
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_indicator_analytics;")
        print("Refreshed mv_indicator_analytics.")
    except Exception:
        conn.rollback(); print("Rolled back - no partial writes."); raise
    finally:
        conn.close()

if __name__ == "__main__":
    main()
