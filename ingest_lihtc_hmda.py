#!/usr/bin/env python3
"""
Cignal System — LIHTC designations (HUD) + mortgage credit flow (CFPB HMDA).

Loads the federal capital-program layer that sits on top of the tract foundation:

  qct            LIHTC Qualified Census Tract        (HUD, tract grain)
  sdda           Metro Difficult Development Area    (HUD, ZCTA grain)
  sdda_ratio     the continuous ranking ratio        (HUD, ZCTA grain)
  nmdda          Non-metro Difficult Development Area(HUD, county grain)
  nmdda_ratio    the continuous ranking ratio        (HUD, county grain)
  hmda_denial_rate / hmda_applications / hmda_orig_volume  (CFPB, county grain)

WHY THESE GRAINS: they are not a choice. HUD designates QCTs on census tracts,
metro DDAs on ZCTAs, and non-metro DDAs on counties. Each loads at its own grain.

QCT/DDA both confer a 30% LIHTC basis boost (eligible basis x 1.30) — the single
biggest lever in affordable-housing feasibility, and therefore a forward read on
where subsidized multifamily supply lands. Redesignated ANNUALLY, so the change
between vintages is itself a signal worth keeping (first prints are never
overwritten; a changed value lands as a new revision).

HMDA is the record Congress created to detect redlining. Cignal ingests only the
volume and outcome fields. The dataset also carries applicant race and ethnicity;
those are deliberately NOT ingested — they have no underwriting use here, and the
distress variables that do (poverty, MFI vs area, denial rate) are already loaded.

Denial rate is SUPPRESSED below MIN_APPS applications: a rate computed on a handful
of loans is noise. ~267 counties fall below the floor.

Env:  SUPABASE_DB_URL   (HUD + CFPB need no key)
Deps: pip install psycopg2-binary requests openpyxl
"""
import os, sys, io, csv, zipfile, datetime as dt
import requests, psycopg2, openpyxl
from concurrent.futures import ThreadPoolExecutor

YEAR = 2026                       # HUD designation vintage
HMDA_YEAR = 2023                  # latest full HMDA year
MIN_APPS = 50                     # denial-rate suppression floor
HUD = "https://www.huduser.gov/portal/datasets/qct"
UA = {"User-Agent": "Mozilla/5.0 (compatible; CignalSystem/1.0)",
      "Referer": "https://www.huduser.gov/portal/datasets/qct.html"}
HMDA_API = "https://ffiec.cfpb.gov/v2/data-browser-api/view/aggregations"
DESIG_DATE = dt.date(YEAR, 1, 1)
HMDA_DATE = dt.date(HMDA_YEAR, 12, 31)


def fetch_qct():
    """{tract_fips11} designated as QCT."""
    r = requests.get(f"{HUD}/QCT{YEAR}CSV.zip", headers=UA, timeout=180); r.raise_for_status()
    z = zipfile.ZipFile(io.BytesIO(r.content))
    name = [n for n in z.namelist() if n.lower().endswith(".csv")][0]
    rows = csv.DictReader(io.TextIOWrapper(z.open(name), "utf-8"))
    return {row["fips"] for row in rows if row.get("fips")}


def fetch_dda():
    """({zcta: (flag, ratio)}, {county_fips: (flag, ratio)})."""
    r = requests.get(f"{HUD}/{YEAR}-DDAs-Data-Used-to-Designate.xlsx", headers=UA, timeout=180)
    r.raise_for_status()
    wb = openpyxl.load_workbook(io.BytesIO(r.content), read_only=True)
    sdda, nmdda = {}, {}
    for row in wb[f"{YEAR} MDDA"].iter_rows(min_row=2, values_only=True):
        if row[0] is None: continue
        sdda[str(row[0]).zfill(5)] = (1 if row[13] == 1 else 0,
                                      float(row[9]) if row[9] is not None else None)
    for row in wb[f"{YEAR} NMDDA"].iter_rows(min_row=2, values_only=True):
        if row[0] is None: continue
        nmdda[str(row[0]).zfill(5)] = (1 if row[12] == 1 else 0,
                                       float(row[9]) if row[9] is not None else None)
    return sdda, nmdda


def fetch_hmda(fips_list):
    """{county_fips: {orig, den, denial_rate, orig_amt}} — action_taken 1=originated, 3=denied."""
    s = requests.Session()
    def one(f):
        try:
            r = s.get(HMDA_API, params={"years": HMDA_YEAR, "counties": f, "actions_taken": "1,3"}, timeout=45)
            if r.status_code != 200: return f, None
            orig = den = 0; amt = 0.0
            for x in r.json().get("aggregations", []):
                if x.get("actions_taken") == "1": orig = x.get("count", 0); amt = float(x.get("sum") or 0)
                elif x.get("actions_taken") == "3": den = x.get("count", 0)
            tot = orig + den
            if not tot: return f, None
            return f, {"orig": orig, "den": den, "rate": round(100 * den / tot, 2), "amt": amt}
        except Exception:
            return f, None
    out = {}
    with ThreadPoolExecutor(max_workers=16) as ex:
        for f, v in ex.map(one, fips_list):
            if v: out[f] = v
    return out


def main():
    db = os.environ.get("SUPABASE_DB_URL")
    if not db: sys.exit("ERROR: SUPABASE_DB_URL must be set")

    qct = fetch_qct()
    sdda, nmdda = fetch_dda()
    print(f"HUD {YEAR}: {len(qct):,} QCTs | {sum(v[0] for v in sdda.values()):,} SDDA ZCTAs "
          f"| {sum(v[0] for v in nmdda.values()):,} non-metro DDA counties")

    conn = psycopg2.connect(db); conn.autocommit = False
    try:
        with conn.cursor() as cur:
            ids = {}
            for slug in ("qct", "sdda", "sdda_ratio", "nmdda", "nmdda_ratio",
                         "hmda_denial_rate", "hmda_applications", "hmda_orig_volume"):
                cur.execute("SELECT id FROM indicators WHERE slug=%s", (slug,))
                row = cur.fetchone()
                if not row: sys.exit(f"ERROR: indicator '{slug}' not registered")
                ids[slug] = row[0]

            cur.execute("SELECT code, id FROM regions WHERE region_type='tract'")
            tract = dict(cur.fetchall())
            cur.execute("SELECT code, id FROM regions WHERE region_type='zcta'")
            zcta = dict(cur.fetchall())
            cur.execute("SELECT fips, id FROM regions WHERE region_type='county' AND fips IS NOT NULL")
            county = dict(cur.fetchall())

            release = dt.date.today()
            tally = {"ins": 0, "rev": 0, "skip": 0}

            def write(slug, rid, od, val):
                cur.execute("SELECT value, revision FROM observations WHERE indicator_id=%s "
                            "AND region_id=%s AND obs_date=%s ORDER BY revision DESC LIMIT 1",
                            (ids[slug], rid, od))
                prev = cur.fetchone()
                if prev is None:
                    cur.execute("INSERT INTO observations(indicator_id,region_id,obs_date,value,revision,release_date)"
                                " VALUES(%s,%s,%s,%s,0,%s)", (ids[slug], rid, od, val, release)); tally["ins"] += 1
                elif float(prev[0]) != float(val):
                    cur.execute("INSERT INTO observations(indicator_id,region_id,obs_date,value,revision,release_date)"
                                " VALUES(%s,%s,%s,%s,%s,%s)", (ids[slug], rid, od, val, prev[1] + 1, release)); tally["rev"] += 1
                else:
                    tally["skip"] += 1

            for code, rid in tract.items():
                write("qct", rid, DESIG_DATE, 1 if code in qct else 0)
            for z, (flag, ratio) in sdda.items():
                rid = zcta.get(z)
                if not rid: continue
                write("sdda", rid, DESIG_DATE, flag)
                if ratio is not None: write("sdda_ratio", rid, DESIG_DATE, round(ratio, 4))
            for f, (flag, ratio) in nmdda.items():
                rid = county.get(f)
                if not rid: continue
                write("nmdda", rid, DESIG_DATE, flag)
                if ratio is not None: write("nmdda_ratio", rid, DESIG_DATE, round(ratio, 4))
            print(f"HUD designations — inserted {tally['ins']}, revised {tally['rev']}, unchanged {tally['skip']}")

            hm = fetch_hmda(list(county.keys()))
            print(f"HMDA {HMDA_YEAR}: {len(hm):,} counties with data")
            t0 = dict(tally); suppressed = 0
            for f, v in hm.items():
                rid = county.get(f)
                if not rid: continue
                apps = v["orig"] + v["den"]
                write("hmda_applications", rid, HMDA_DATE, apps)
                write("hmda_orig_volume", rid, HMDA_DATE, v["amt"])
                if apps >= MIN_APPS: write("hmda_denial_rate", rid, HMDA_DATE, v["rate"])
                else: suppressed += 1
            print(f"HMDA — inserted {tally['ins']-t0['ins']}, revised {tally['rev']-t0['rev']}, "
                  f"rate suppressed for {suppressed} thin counties")

            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_indicator_analytics;")
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
