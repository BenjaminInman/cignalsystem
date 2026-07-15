#!/usr/bin/env python3
"""
Cignal System — Census tract distress metrics + Opportunity Zone 2.0 eligibility.

Loads three tract-grain indicators from the original sources:

  tract_poverty_rate      poverty rate            (Census ACS B17001)
  tract_mfi_pct_of_area   MFI as % of area median (Census ACS B19113 + benchmark)
  oz2_eligible            OZ 2.0 Low-Income Community flag (1/0), Cignal-computed

OZ 2.0 RULE (26 U.S.C. 1400Z-1 as amended by OBBBA, effective 2027-01-01):
  A tract is an eligible Low-Income Community if EITHER
    (A) median family income <= 70% of the applicable area median, OR
    (B) poverty rate >= 20% AND median family income < 125% of the area median.
  The applicable area median is the METRO MFI for tracts whose county sits in a
  Metropolitan Statistical Area, and the STATE MFI otherwise (micropolitan and
  non-CBSA counties benchmark to the state). Contiguous-tract eligibility, which
  existed under OZ 1.0, was removed.

  Governors nominate up to 25% of eligible tracts (min 25); Treasury certifies.
  OZ 1.0 designations sunset 2028-12-31.

IMPORTANT — this is Cignal-computed eligibility, NOT the official Treasury list.
Treasury sets the final dataset and ACS vintage. Label it as such wherever shown.

Geography: CBSAs are built from whole counties, so tract -> county (first 5 of the
11-digit FIPS) -> CBSA resolves exactly, using the Census delineation file.

Env:  CENSUS_API_KEY, SUPABASE_DB_URL   [same secrets as ingest_census]
Deps: pip install psycopg2-binary requests openpyxl
"""
import os, sys, io, datetime as dt
import requests, psycopg2, openpyxl

ACS = "https://api.census.gov/data/{yr}/acs/acs5"
DELINEATION = ("https://www2.census.gov/programs-surveys/metro-micro/geographies/"
               "reference-files/2023/delineation-files/list1_2023.xlsx")
VINTAGE = 2023                  # ACS 5-year end year
OBS_DATE = dt.date(VINTAGE, 12, 31)

MFI_VAR = "B19113_001E"         # median family income
POV_TOT = "B17001_001E"         # population w/ poverty status determined
POV_NUM = "B17001_002E"         # below poverty


def county_to_cbsa():
    """{county_fips5: (cbsa_code, is_metropolitan)} from the Census delineation file."""
    r = requests.get(DELINEATION, timeout=120); r.raise_for_status()
    ws = openpyxl.load_workbook(io.BytesIO(r.content)).active
    out = {}
    for row in range(4, ws.max_row + 1):
        cbsa, typ = ws.cell(row, 1).value, ws.cell(row, 5).value
        st, co = ws.cell(row, 10).value, ws.cell(row, 11).value
        if not (cbsa and st and co):
            continue
        fips = f"{str(st).zfill(2)}{str(co).zfill(3)}"
        out[fips] = (str(cbsa), typ == "Metropolitan Statistical Area")
    return out


def acs(params, key):
    params["key"] = key
    r = requests.get(ACS.format(yr=VINTAGE), params=params, timeout=180)
    return r.json() if r.status_code == 200 else None


def num(v):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return f if f >= 0 else None      # Census annotates suppressed values negative


def main():
    key = os.environ.get("CENSUS_API_KEY"); db = os.environ.get("SUPABASE_DB_URL")
    if not key or not db:
        sys.exit("ERROR: CENSUS_API_KEY and SUPABASE_DB_URL must both be set")

    xw = county_to_cbsa()
    states = [x[1] for x in acs({"get": "NAME", "for": "state:*"}, key)[1:]]
    state_mfi = {x[2]: num(x[1]) for x in acs({"get": f"NAME,{MFI_VAR}", "for": "state:*"}, key)[1:]}
    metro_mfi = {x[2]: num(x[1]) for x in acs(
        {"get": f"NAME,{MFI_VAR}",
         "for": "metropolitan statistical area/micropolitan statistical area:*"}, key)[1:]}

    records = []
    for s in states:
        d = acs({"get": f"NAME,{MFI_VAR},{POV_TOT},{POV_NUM}", "for": "tract:*", "in": f"state:{s}"}, key)
        if not d:
            print(f"  state {s}: no data"); continue
        for x in d[1:]:
            fips = f"{x[4]}{x[5]}{x[6]}"
            cbsa, is_metro = xw.get(f"{x[4]}{x[5]}", (None, False))
            bench = metro_mfi.get(cbsa) if (is_metro and cbsa) else state_mfi.get(x[4])
            if not bench:
                continue
            mfi, tot, poor = num(x[1]), num(x[2]), num(x[3])
            pov = 100 * poor / tot if (tot and poor is not None and tot > 0) else None
            if mfi is None and pov is None:
                continue
            pct = 100 * mfi / bench if mfi is not None else None
            path_a = pct is not None and pct <= 70
            path_b = (pov is not None and pov >= 20) and (pct is not None and pct < 125)
            records.append({"fips": fips, "name": x[0], "cbsa": cbsa,
                            "pct": round(pct, 1) if pct is not None else None,
                            "pov": round(pov, 1) if pov is not None else None,
                            "elig": 1 if (path_a or path_b) else 0})
    print(f"tracts evaluated: {len(records):,} | OZ 2.0 eligible: {sum(r['elig'] for r in records):,}")

    conn = psycopg2.connect(db); conn.autocommit = False
    try:
        with conn.cursor() as cur:
            ids = {}
            for slug in ("oz2_eligible", "tract_mfi_pct_of_area", "tract_poverty_rate"):
                cur.execute("SELECT id FROM indicators WHERE slug=%s", (slug,))
                row = cur.fetchone()
                if not row:
                    sys.exit(f"ERROR: indicator '{slug}' not registered")
                ids[slug] = row[0]

            # upsert tract regions
            for r in records:
                cur.execute(
                    "INSERT INTO regions (region_type, code, name, fips, cbsa_code) "
                    "VALUES ('tract',%s,%s,%s,%s) ON CONFLICT DO NOTHING",
                    (r["fips"], r["name"], r["fips"], r["cbsa"]))
            cur.execute("SELECT code, id FROM regions WHERE region_type='tract'")
            rid = dict(cur.fetchall())

            release = dt.date.today()
            ins = rev = skip = 0
            def write(slug, region_id, val):
                nonlocal ins, rev, skip
                cur.execute("SELECT value, revision FROM observations WHERE indicator_id=%s "
                            "AND region_id=%s AND obs_date=%s ORDER BY revision DESC LIMIT 1",
                            (ids[slug], region_id, OBS_DATE))
                prev = cur.fetchone()
                if prev is None:
                    cur.execute("INSERT INTO observations(indicator_id,region_id,obs_date,value,revision,release_date)"
                                " VALUES(%s,%s,%s,%s,0,%s)", (ids[slug], region_id, OBS_DATE, val, release)); ins += 1
                elif float(prev[0]) != float(val):
                    cur.execute("INSERT INTO observations(indicator_id,region_id,obs_date,value,revision,release_date)"
                                " VALUES(%s,%s,%s,%s,%s,%s)",
                                (ids[slug], region_id, OBS_DATE, val, prev[1] + 1, release)); rev += 1
                else:
                    skip += 1

            for r in records:
                g = rid.get(r["fips"])
                if not g:
                    continue
                write("oz2_eligible", g, r["elig"])
                if r["pct"] is not None: write("tract_mfi_pct_of_area", g, r["pct"])
                if r["pov"] is not None: write("tract_poverty_rate", g, r["pov"])

            print(f"OZ/tract — inserted {ins}, revised {rev}, unchanged {skip}")
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_indicator_analytics;")
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
