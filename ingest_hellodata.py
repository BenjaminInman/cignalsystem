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
  coverage - CSV of zip_code + CountDistinct(property_id) + Sum(number_units)
           + Max(number_units). Writes hd_region_coverage, which drives
           disclosure control: a ZIP publishes only with >=3 properties AND no
           single property above 50% of units. The count rule guards statistical
           stability; the dominance rule guards re-identification (two buildings,
           one at 66% of units, lets an operator who knows one derive the other).
           Suppressed ZIPs fall back to metro - never to a neighbouring ZIP,
           which is a different submarket and would describe neither.

If the export includes as_of_month, rows are dated per-month (history backfill).
Otherwise HD_OBS_DATE (default: first of the current month) is used for all rows.

Env: SUPABASE_DB_URL, HD_MODE, HD_URL, [HD_OBS_DATE=YYYY-MM-DD]
Deps: pip install pandas psycopg2-binary requests
"""
import io, os, sys, re, datetime as dt
import requests, pandas as pd, psycopg2
from psycopg2.extras import execute_values

SOURCE = "HelloData"

# ---------------------------------------------------------------------------
# THE UNIVERSE. Every HelloData export must use exactly these filters, or the
# series carries a methodology seam at whichever month the basis changed.
#
#   number_units >= 50      conventional multifamily, not scattered small stock
#   is_affordable == false  LIHTC / subsidised units price off AMI formulas and
#                           HUD schedules, not off the market. In Nashville they
#                           were 12% of properties but moved the average only $5
#                           - the reason to exclude them is not the level, it is
#                           that policy-set rents do not respond to concessions,
#                           lease-up pressure or demand shocks, so they damp the
#                           volatility of the exact series used to detect turns.
#
# NOTE: is_affordable takes a BOOLEAN via `equals`, not the `flag` operator the
# schema implies:  {"column":"is_affordable","filter":{"equals":false}}
#
# Coverage counts MUST be pulled on this same universe. Counting properties that
# are excluded from the rent average would mean the disclosure floor is measuring
# a different population than the data it protects.
# ---------------------------------------------------------------------------
UNIVERSE = "mf50_nonaffordable"
# Disclosure control for ZIP cells. Both must hold to publish.
MIN_PROPERTIES = 3        # statistical stability
MAX_DOMINANCE_PCT = 50.0  # re-identification guard
# slug, csv column, units, classification, higher_is_better, scale
METRICS = [
    ("hd_asking_rent",    "asking_rent",       "USD",  "coincident", True,  1.0),
    ("hd_effective_rent", "effective_rent",    "USD",  "leading",    True,  1.0),
    ("hd_concession",     "concession",        "USD",  "leading",    False, 1.0),
    ("hd_leased_pct",     "leased_percentage", "%",    "coincident", True,  100.0),
    ("hd_dom",            "days_on_market",    "days", "leading",    False, 1.0),
]
COVERAGE = [
    ("hd_property_count", "properties", "coincident", True),
    ("hd_unit_count",     "units",      "coincident", True),
]

# HelloData's geography is not clean: the national pull returned 75 ZIP strings
# that are not real ZCTAs, including one (85288) with 15 properties and 5,167
# units that would have cleared the disclosure floor and published. Joining
# against `regions` does not catch these, because regions is not an authoritative
# ZIP list. Validate against the Census ZCTA gazetteer instead.
ZCTA_URL = ("https://www2.census.gov/geo/docs/maps-data/data/gazetteer/"
            "2024_Gazetteer/2024_Gaz_zcta_national.zip")
_zcta_cache = None

def valid_zctas():
    global _zcta_cache
    if _zcta_cache is None:
        import zipfile
        r = requests.get(ZCTA_URL, timeout=300); r.raise_for_status()
        z = zipfile.ZipFile(io.BytesIO(r.content))
        name = [n for n in z.namelist() if n.endswith(".txt")][0]
        out = set()
        for i, line in enumerate(z.open(name).read().decode("latin-1").splitlines()):
            if i == 0:
                continue
            c = line.split("\t")[0].strip()
            if c.isdigit():
                out.add(c.zfill(5))
        _zcta_cache = out
        print(f"  loaded {len(out):,} authoritative ZCTAs for validation")
    return _zcta_cache

def drop_invalid_zips(df, col="_code"):
    good = valid_zctas()
    bad = sorted(set(df.loc[~df[col].isin(good), col]))
    if bad:
        print(f"  REJECTED {len(bad)} invalid ZIP(s) not in the Census ZCTA list: "
              f"{bad[:10]}{' …' if len(bad) > 10 else ''}")
    return df[df[col].isin(good)].copy()

def norm(s):
    """Normalise an MSA label for matching. Strips ALL non-alphanumerics.

    The previous version collapsed hyphens and whitespace but PRESERVED commas,
    which silently broke every metro whose regions.name has lost its comma:

        HelloData  "Cleveland-Elyria, OH" -> "cleveland elyria, oh"
        regions    "Cleveland-Elyria  OH" -> "cleveland elyria oh"

    No match, so metro_code_map returned nothing, every row was dropped, and the
    drain reported success having written zero rows. Cleveland and Dayton each
    delivered 38 good rows on 2026-08-01 that went nowhere. Affects Ocean City NJ
    and East Stroudsburg PA too - anywhere the comma is missing.

    Stripping everything also matches how hd_metro_size.msa_label was populated,
    so the two lookups can no longer disagree.
    """
    return re.sub(r"[^a-z0-9]", "", str(s).lower())

def month_start(x):
    """HelloData as_of_month -> first-of-month date string. Monthly series MUST be
    dated by the month they describe, not by the day we loaded them, or YoY never
    aligns across runs."""
    d = pd.to_datetime(str(x)).date()
    return d.replace(day=1).isoformat()

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
    """HelloData MSA label -> region code, from the STORED crosswalk.

    The crosswalk (hd_metro_size.msa_label) holds HelloData's own string, so this
    is a lookup, not a derivation. Deriving it from regions.name has now failed
    SIX distinct ways - two metro families sharing names, lost commas, comma-
    sensitive normalisation, renamed suffix cities (Houston-Pasadena vs
    Houston-Sugar Land), added states (IL-IN vs IL-IN-WI), and renamed suffix
    cities again on the inbound side (HelloData's "Las Vegas-Henderson-Paradise"
    vs our "Las Vegas-Henderson-North Las Vegas").

    Both directions must use the same table. Firing with the crosswalk while
    ingesting by derivation is what produced 22 rejected deliveries carrying
    valid data on 2026-08-04.

    regions.name is kept only as a last-resort fallback for rows that predate the
    crosswalk; it is never authoritative.
    """
    cur.execute("""
        SELECT s.msa_label, r.code
          FROM hd_metro_size s
          JOIN regions r ON r.id = s.region_id
         WHERE s.msa_label IS NOT NULL AND r.code ~ '^[0-9]{5}$'
    """)
    m = {norm(lbl): code for lbl, code in cur.fetchall()}
    # fallback: any CBSA region not present in the crosswalk
    cur.execute("""SELECT code, name FROM regions
                    WHERE region_type='metro' AND code ~ '^[0-9]{5}$'
                      AND retired_at IS NULL
                    ORDER BY code""")
    for code, name in cur.fetchall():
        m.setdefault(norm(name), code)
    return m


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

def run_one(conn, mode, url, obs_date=None, release=None, refresh=True, segment=None):
    """Process a single export into an existing connection.

    Split out from main() so the drain worker can reuse it across a queue of
    deliveries and refresh the materialized view once for the whole batch
    instead of once per file.
    """
    obs_date = obs_date or dt.date.today().replace(day=1).isoformat()
    release = release or dt.date.today()
    df = download(url) if mode in ("zip", "metro", "roster", "coverage") else None
    if df is not None:
        print(f"  downloaded {len(df):,} rows; cols={list(df.columns)}")

    with conn.cursor() as cur:
        if mode in ("zip", "metro"):
            region_type = "zip" if mode == "zip" else "metro"
            if mode == "zip":
                df = df[df["zip_code"].notna()].copy()
                df["_code"] = df["zip_code"].astype(str).str.split(".").str[0].str.zfill(5)
                df = drop_invalid_zips(df)
                upsert_zip_regions(cur, sorted(df["_code"].unique()))
                print(f"  upserted {df['_code'].nunique():,} zip regions")
            else:
                cmap = metro_code_map(cur)
                df["_code"] = df["msa"].map(lambda m: cmap.get(norm(m)))
                miss = sorted(df[df["_code"].isna()]["msa"].dropna().unique())
                if miss:
                    print(f"  WARN {len(miss)} metro label(s) unmatched: {miss[:5]}")
                df = df[df["_code"].notna()].copy()
                # A metro export that maps to NOTHING must fail, not succeed
                # quietly. Cleveland and Dayton each delivered 38 valid rows on
                # 2026-08-01 that were dropped by a normalisation mismatch; the
                # drain marked both "done" and moved on, and the gap only
                # surfaced days later during a manual reconciliation.
                if df.empty:
                    raise ValueError(
                        f"metro export matched no region in `regions` "
                        f"(labels seen: {miss[:5]}) - refusing to record success")

            if "as_of_month" in df.columns:
                df["_date"] = df["as_of_month"].map(month_start)
                print(f"  history: {df['_date'].nunique()} months "
                      f"({df['_date'].min()} -> {df['_date'].max()})")
            else:
                df["_date"] = obs_date
                print(f"  snapshot: single date {obs_date}")

            for slug, col, units, cls, hib, scale in METRICS:
                if col not in df.columns:
                    print(f"  skip {slug}: column {col} absent"); continue
                seg_slug = f"{slug}_{segment}" if segment else slug
                seg_series = f"querybuilder:{col}:{UNIVERSE}" + (f"_{segment}" if segment else "")
                ind = ensure_indicator(cur, seg_slug,
                    f"HelloData {seg_slug.replace('hd_','').replace('_',' ').title()} (multifamily)",
                    seg_series, units, cls, hib)
                sub = df[["_code", "_date", col]].dropna(subset=[col])
                rows = [(c, d, float(v) * scale) for c, d, v in sub.itertuples(index=False)]
                n = load(cur, ind, region_type, rows, release)
                print(f"  {seg_slug}: {len(rows):,} cells -> {n:,} written")

        elif mode == "coverage":
            cols = list(df.columns)
            df.columns = ["zip_code", "properties", "units", "max_units"] + cols[4:]
            df = df[df["zip_code"].notna()].copy()
            df["_code"] = df["zip_code"].astype(str).str.split(".").str[0].str.zfill(5)
            df = drop_invalid_zips(df)
            upsert_zip_regions(cur, sorted(df["_code"].unique()))
            rows = []
            for c, p, u, mx in df[["_code", "properties", "units", "max_units"]].itertuples(index=False):
                p, u, mx = int(p), int(u), int(mx)
                share = (100.0 * mx / u) if u else 100.0
                rows.append((c, p, u, mx, bool(p >= MIN_PROPERTIES and share <= MAX_DOMINANCE_PCT)))
            cur.execute("DROP TABLE IF EXISTS _hd_cov;")
            cur.execute("CREATE TEMP TABLE _hd_cov (code text, p int, u bigint, mx int, pub boolean);")
            buf = io.StringIO()
            for c, p, u, mx, pub in rows:
                buf.write(f"{c},{p},{u},{mx},{'t' if pub else 'f'}\n")
            buf.seek(0)
            cur.copy_expert("COPY _hd_cov (code, p, u, mx, pub) FROM STDIN WITH CSV", buf)
            if segment:
                cur.execute("""
                    INSERT INTO hd_segment_coverage
                        (region_id, segment, properties, units, max_property_units, publishable, as_of)
                    SELECT r.id, %(seg)s, s.p, s.u, s.mx, s.pub, %(d)s
                    FROM _hd_cov s JOIN regions r ON r.region_type='zip' AND r.code=s.code
                    ON CONFLICT (region_id, segment) DO UPDATE SET
                        properties=excluded.properties, units=excluded.units,
                        max_property_units=excluded.max_property_units,
                        publishable=excluded.publishable, as_of=excluded.as_of,
                        updated_at=now();
                """, {"d": obs_date, "seg": segment})
            else:
                cur.execute("""
                    INSERT INTO hd_region_coverage
                        (region_id, properties, units, max_property_units, publishable, as_of)
                    SELECT r.id, s.p, s.u, s.mx, s.pub, %(d)s
                    FROM _hd_cov s JOIN regions r ON r.region_type='zip' AND r.code=s.code
                    ON CONFLICT (region_id) DO UPDATE SET
                        properties=excluded.properties, units=excluded.units,
                        max_property_units=excluded.max_property_units,
                        publishable=excluded.publishable, as_of=excluded.as_of,
                        updated_at=now();
                """, {"d": obs_date})
            npub = sum(1 for r in rows if r[4])
            print(f"  coverage: {len(rows):,} zips -> {npub:,} publishable, "
                  f"{len(rows)-npub:,} suppressed (floor {MIN_PROPERTIES} props / "
                  f"{MAX_DOMINANCE_PCT}% dominance)")

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

        elif mode == "cleanup":
            cur.execute("SELECT id FROM indicators WHERE slug=%s", (url,))
            row = cur.fetchone()
            if not row:
                print(f"  nothing to clean: {url} absent")
            else:
                iid = row[0]
                cur.execute("DELETE FROM observations WHERE indicator_id=%s", (iid,))
                print(f"  deleted {cur.rowcount} observations for {url}")
                cur.execute("DELETE FROM indicators WHERE id=%s", (iid,))
                print(f"  deleted indicator {url}")
        else:
            raise ValueError(f"unknown HD_MODE {mode}")

    if refresh:
        prev = conn.autocommit
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("SET statement_timeout = 0")
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_indicator_analytics;")
        print("Refreshed mv_indicator_analytics.")
        conn.autocommit = prev


def main():
    db = os.environ.get("SUPABASE_DB_URL")
    mode = os.environ.get("HD_MODE")
    url = os.environ.get("HD_URL")
    if not (db and mode and url):
        sys.exit("ERROR: need SUPABASE_DB_URL, HD_MODE, HD_URL")
    obs_date = os.environ.get("HD_OBS_DATE") or None
    print(f"HelloData ingestion - mode={mode}")
    conn = psycopg2.connect(db); conn.autocommit = False
    try:
        run_one(conn, mode, url, obs_date=obs_date, refresh=False)
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
