#!/usr/bin/env python3
"""
Cignal System — IRS SOI county-to-county migration -> metro aggregates.

Pulls IRS inflow/outflow county files, rolls them up to CBSA metros using the
Census delineation file (county FIPS -> CBSA), excludes intra-metro moves, and
computes per-metro: net domestic migration (households), average in-migrant AGI,
and the in-minus-out AGI differential. Loads them as three annual indicators
(irs_net_migration, irs_inflow_agi, irs_agi_differential) keyed to the same
Zillow metro regions used for rent — first print = revision 0, insert-if-changed.

Usage:   YEAR_CODE=2223 python ingest_irs.py     (default 2223 = CY2022->2023)
Env:     SUPABASE_DB_URL   (Session pooler URI)
Deps:    pip install requests openpyxl psycopg2-binary
"""
import csv, io, os, sys, datetime as dt
import requests, openpyxl, psycopg2
from psycopg2.extras import execute_values

YEAR_CODE = os.environ.get("YEAR_CODE", "2223")
OBS_DATE = dt.date(2000 + int(YEAR_CODE[2:]), 12, 31)          # 2223 -> 2023-12-31
IRS = "https://www.irs.gov/pub/irs-soi"
DELIN = ("https://www2.census.gov/programs-surveys/metro-micro/geographies/"
         "reference-files/2023/delineation-files/list1_2023.xlsx")
INDICATORS = [
    ("irs_net_migration", "IRS Net Domestic Migration — Metro (households)", "households", "net_returns"),
    ("irs_inflow_agi",    "IRS In-Migrant Average AGI — Metro",              "USD",        "avg_in_agi"),
    ("irs_agi_differential","IRS In–Out Migrant AGI Differential — Metro",   "USD",        "agi_diff"),
]


def num(x):
    try: return int(x)
    except Exception: return 999


def county_to_cbsa():
    r = requests.get(DELIN, timeout=120); r.raise_for_status()
    wb = openpyxl.load_workbook(io.BytesIO(r.content), read_only=True, data_only=True)
    rows = list(wb.active.iter_rows(values_only=True))
    hi = next(i for i, row in enumerate(rows) if row and "CBSA Code" in row)
    H = {c: i for i, c in enumerate(rows[hi]) if isinstance(c, str)}
    c2cbsa, title = {}, {}
    for row in rows[hi + 1:]:
        if not row or row[H["CBSA Code"]] is None: continue
        if row[H["Metropolitan/Micropolitan Statistical Area"]] != "Metropolitan Statistical Area": continue
        fips = str(row[H["FIPS State Code"]]).zfill(2) + str(row[H["FIPS County Code"]]).zfill(3)
        code = str(row[H["CBSA Code"]]); c2cbsa[fips] = code; title[code] = row[H["CBSA Title"]]
    return c2cbsa, title


def cbsa_to_metro(cur, title):
    """Map CBSA title (long) -> Zillow metro region (id, short code) via prefix + first-state."""
    cur.execute("SELECT id, zillow_id, code FROM regions WHERE region_type='metro'")
    metros = []
    for rid, zid, code in cur.fetchall():
        if ", " not in code: continue
        city, st = code.rsplit(", ", 1); metros.append((rid, city, st, code))
    def first_state(t):
        try: return t.rsplit(", ", 1)[1].split("-")[0]
        except Exception: return ""
    out = {}
    for cbsa, t in title.items():
        fs = first_state(t); best = None; bl = -1
        for rid, city, st, code in metros:
            if st == fs and t.startswith(city) and len(city) > bl:
                best = (rid, code); bl = len(city)
        if best: out[cbsa] = best
    return out


def aggregate(path, c2cbsa, subj_is_dest):
    acc = {}
    r = requests.get(path, timeout=180); r.raise_for_status()
    for row in csv.DictReader(io.StringIO(r.content.decode("latin-1"))):
        if num(row["y1_statefips"]) > 56 or num(row["y2_statefips"]) > 56: continue
        of = row["y1_statefips"].zfill(2) + row["y1_countyfips"].zfill(3); df = row["y2_statefips"].zfill(2) + row["y2_countyfips"].zfill(3)
        if of == df: continue
        o = c2cbsa.get(of); d = c2cbsa.get(df)
        subj, other = (d, o) if subj_is_dest else (o, d)
        if not subj or subj == other: continue
        try: n1, n2, agi = int(row["n1"]), int(row["n2"]), int(row["agi"])
        except Exception: continue
        if n1 <= 0: continue
        a = acc.setdefault(subj, [0, 0, 0]); a[0] += n1; a[1] += n2; a[2] += agi
    return acc


def ensure_indicator(cur, slug, name, units):
    cur.execute("SELECT id FROM indicators WHERE slug=%s", (slug,))
    row = cur.fetchone()
    if row: return row[0]
    cur.execute("""INSERT INTO indicators (slug,name,source,source_series,frequency,units,
                   classification,higher_is_better,is_public)
                   VALUES (%s,%s,'IRS SOI',%s,'annual',%s,'leading'::public.indicator_class,true,true)
                   RETURNING id""", (slug, name, f"countyflow{YEAR_CODE}", units))
    return cur.fetchone()[0]


def load(cur, ind_id, region_id, value):
    cur.execute("""
        SELECT value FROM observations
        WHERE indicator_id=%s AND region_id=%s AND obs_date=%s
        ORDER BY revision DESC LIMIT 1""", (ind_id, region_id, OBS_DATE))
    prev = cur.fetchone()
    if prev and float(prev[0]) == float(value): return 0
    rev = 0
    if prev:
        cur.execute("""SELECT COALESCE(MAX(revision),-1)+1 FROM observations
                       WHERE indicator_id=%s AND region_id=%s AND obs_date=%s""",
                    (ind_id, region_id, OBS_DATE)); rev = cur.fetchone()[0]
    cur.execute("""INSERT INTO observations (indicator_id,region_id,obs_date,value,revision,release_date)
                   VALUES (%s,%s,%s,%s,%s,%s)""", (ind_id, region_id, OBS_DATE, value, rev, dt.date.today()))
    return 1


def main():
    db = os.environ.get("SUPABASE_DB_URL")
    if not db: sys.exit("ERROR: SUPABASE_DB_URL not set")
    print(f"IRS migration ingest — year {YEAR_CODE} -> {OBS_DATE}")
    c2cbsa, title = county_to_cbsa()
    inflow = aggregate(f"{IRS}/countyinflow{YEAR_CODE}.csv", c2cbsa, True)
    outflow = aggregate(f"{IRS}/countyoutflow{YEAR_CODE}.csv", c2cbsa, False)
    print(f"  aggregated {len(inflow)} inflow / {len(outflow)} outflow CBSAs")

    conn = psycopg2.connect(db); conn.autocommit = False
    try:
        with conn.cursor() as cur:
            metro = cbsa_to_metro(cur, title)
            ids = {slug: ensure_indicator(cur, slug, name, units) for slug, name, units, _ in INDICATORS}
            written = 0
            for cbsa, (rid, code) in metro.items():
                i = inflow.get(cbsa); o = outflow.get(cbsa)
                if not i and not o: continue
                in_n1, in_n2, in_agi = i or (0, 0, 0); out_n1, out_n2, out_agi = o or (0, 0, 0)
                vals = {
                    "net_returns": in_n1 - out_n1,
                    "avg_in_agi": round(in_agi * 1000 / in_n1) if in_n1 else None,
                    "agi_diff": (round(in_agi * 1000 / in_n1) - round(out_agi * 1000 / out_n1))
                                if (in_n1 and out_n1) else None,
                }
                for slug, _, _, field in INDICATORS:
                    v = vals[field]
                    if v is not None: written += load(cur, ids[slug], rid, v)
            print(f"  inserted/updated {written} observations")
        conn.commit()
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("SET statement_timeout = 0")
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_indicator_analytics;")
        print("Refreshed mv_indicator_analytics. Done.")
    except Exception:
        conn.rollback(); print("Rolled back."); raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
