#!/usr/bin/env python3
"""
Cignal System — BLS QCEW county wages ingestion.

Loads average weekly wage (all industries, all ownerships) by county from the
BLS Quarterly Census of Employment and Wages, into the `county_wages` indicator.
Uses QCEW's industry slice for industry_code 10 (Total, all industries), keeping
only county-total rows (agglvl_code 70, own_code 0). One small CSV per quarter,
every US county in each file — no per-county fan-out.

Wages resolve off the SAME county regions the GDP signal uses, so the "Where Are
We" local ring reads GDP and wages from one place. County key = 5-digit FIPS.

Q1 carries first-quarter bonus seasonality, so this metric must be read
year-over-year (the analytics view compares same-quarter prior year).

Revision model: revision 0 = first print, never overwritten; a changed value for
an existing (indicator, region, date) gets the next revision number — identical
to the BEA/FRED ingests.

Env:  SUPABASE_DB_URL
Deps: pip install psycopg2-binary requests
"""
import os, sys, csv, io, datetime as dt
import requests, psycopg2

SLUG = "county_wages"
QEND = {"1": "03-31", "2": "06-30", "3": "09-30", "4": "12-31"}
API = "https://data.bls.gov/cew/data/api/{year}/{qtr}/industry/10.csv"
UA = {"User-Agent": "CignalSystem/1.0 (ingest)"}


def quarters_back(n_years=3):
    """The last n_years of quarters, newest first (we skip any not yet published)."""
    today = dt.date.today()
    y = today.year
    out = []
    for yr in range(y, y - n_years - 1, -1):
        for q in (4, 3, 2, 1):
            out.append((yr, q))
    return out


def fetch_quarter(year, qtr):
    """Return list of (fips, avg_wkly_wage:int) for county totals, or [] if unavailable."""
    url = API.format(year=year, qtr=qtr)
    try:
        r = requests.get(url, headers=UA, timeout=120)
        if r.status_code != 200 or not r.content:
            return []
    except Exception as e:
        print(f"  {year}Q{qtr}: request failed ({e})")
        return []
    out = []
    for row in csv.DictReader(io.StringIO(r.text)):
        if row.get("agglvl_code") == "70" and row.get("own_code") == "0":
            w = (row.get("avg_wkly_wage") or "").strip()
            if w.isdigit() and int(w) > 0:
                out.append((row["area_fips"], int(w)))
    return out


def main():
    db = os.environ.get("SUPABASE_DB_URL")
    if not db:
        sys.exit("ERROR: SUPABASE_DB_URL must be set")
    release = dt.date.today()
    conn = psycopg2.connect(db); conn.autocommit = False
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM indicators WHERE slug=%s", (SLUG,))
            row = cur.fetchone()
            if not row:
                sys.exit(f"ERROR: indicator '{SLUG}' is not registered")
            ind_id = row[0]

            # County key = FIPS. Prefer the region this indicator already uses for
            # a FIPS (keeps wages co-located with GDP); fall back to any county
            # region with that FIPS.
            cur.execute(
                "SELECT r.fips, r.id FROM regions r "
                "JOIN observations o ON o.region_id = r.id AND o.indicator_id = "
                "(SELECT id FROM indicators WHERE slug='gdp_county') "
                "WHERE r.region_type='county' AND r.fips IS NOT NULL"
            )
            county_rid = {f: i for f, i in cur.fetchall()}
            cur.execute("SELECT fips, id FROM regions WHERE region_type='county' AND fips IS NOT NULL")
            for f, i in cur.fetchall():
                county_rid.setdefault(f, i)

            # Existing revision-0 values, to preserve first prints.
            cur.execute(
                "SELECT region_id, obs_date, value FROM observations "
                "WHERE indicator_id=%s AND revision=0", (ind_id,)
            )
            rev0 = {(rid, d): v for rid, d, v in cur.fetchall()}
            cur.execute(
                "SELECT region_id, obs_date, MAX(revision) FROM observations "
                "WHERE indicator_id=%s GROUP BY region_id, obs_date", (ind_id,)
            )
            maxrev = {(rid, d): r for rid, d, r in cur.fetchall()}

            ins = skip = revd = 0
            for (year, qtr) in quarters_back(3):
                rows = fetch_quarter(year, qtr)
                if not rows:
                    continue
                obs_date = dt.date(year, *map(int, QEND[str(qtr)].split("-")))
                for fips, wage in rows:
                    rid = county_rid.get(fips)
                    if not rid:
                        continue
                    key = (rid, obs_date)
                    if key not in rev0:
                        cur.execute(
                            "INSERT INTO observations (indicator_id, region_id, obs_date, value, revision, release_date) "
                            "VALUES (%s,%s,%s,%s,0,%s) ON CONFLICT DO NOTHING",
                            (ind_id, rid, obs_date, wage, release),
                        )
                        ins += 1
                    elif float(rev0[key]) != float(wage):
                        nr = (maxrev.get(key, 0) or 0) + 1
                        cur.execute(
                            "INSERT INTO observations (indicator_id, region_id, obs_date, value, revision, release_date) "
                            "VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
                            (ind_id, rid, obs_date, wage, nr, release),
                        )
                        revd += 1
                    else:
                        skip += 1
                print(f"  {year}Q{qtr}: {len(rows)} counties processed")
        conn.commit()
        print(f"QCEW ingest complete — inserted {ins}, revised {revd}, unchanged {skip}")
    except Exception as e:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
