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

# Two grains, one file: QCEW's industry-10 quarterly CSV carries county totals
# (agglvl 70) and MSA totals (agglvl 40) side by side, both at own_code 0 (all
# ownerships). We parse both from a single request rather than fetching twice.
COUNTY_SLUG = "county_wages"
METRO_SLUG = "metro_wages"
QEND = {"1": "03-31", "2": "06-30", "3": "09-30", "4": "12-31"}
API = "https://data.bls.gov/cew/data/api/{year}/{qtr}/industry/10.csv"
UA = {"User-Agent": "CignalSystem/1.0 (ingest; info@cignalsystem.com)"}


def _get_retry(url, headers=None, timeout=120, attempts=4):
    """BLS throttles by IP with 403s; back off rather than dropping a quarter."""
    import time as _t
    delay = 5
    for i in range(attempts):
        r = requests.get(url, headers=headers, timeout=timeout)
        if r.status_code == 200 or (r.status_code not in (403, 429) and r.status_code < 500):
            return r
        if i < attempts - 1:
            _t.sleep(delay)
            delay = min(delay * 2, 40)
    return r


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
    """Return {"county": [(fips, wage)], "metro": [(cbsa, wage)]} for the quarter.

    County rows are agglvl 70 keyed by 5-digit FIPS. MSA rows are agglvl 40 keyed
    by area_fips of the form "C" + the CBSA's first four digits (e.g. C3498 for
    Nashville's CBSA 34980), so the CBSA is area_fips[1:] + "0".
    """
    url = API.format(year=year, qtr=qtr)
    try:
        r = _get_retry(url, headers=UA, timeout=120)
        if r.status_code != 200 or not r.content:
            return {"county": [], "metro": []}
    except Exception as e:
        print(f"  {year}Q{qtr}: request failed ({e})")
        return {"county": [], "metro": []}
    out = {"county": [], "metro": []}
    for row in csv.DictReader(io.StringIO(r.text)):
        if row.get("own_code") != "0":
            continue
        w = (row.get("avg_wkly_wage") or "").strip()
        if not (w.isdigit() and int(w) > 0):
            continue
        agg = row.get("agglvl_code")
        area = row["area_fips"]
        if agg == "70":
            out["county"].append((area, int(w)))
        elif agg == "40" and len(area) == 5 and area[0] == "C" and area[1:].isdigit():
            out["metro"].append((area[1:] + "0", int(w)))
    return out


def _indicator_id(cur, slug):
    cur.execute("SELECT id FROM indicators WHERE slug=%s", (slug,))
    row = cur.fetchone()
    if not row:
        sys.exit(f"ERROR: indicator '{slug}' is not registered")
    return row[0]


def _existing(cur, ind_id):
    """revision-0 values (first prints, never overwritten) + current max revision."""
    cur.execute(
        "SELECT region_id, obs_date, value FROM observations "
        "WHERE indicator_id=%s AND revision=0", (ind_id,))
    rev0 = {(rid, d): v for rid, d, v in cur.fetchall()}
    cur.execute(
        "SELECT region_id, obs_date, MAX(revision) FROM observations "
        "WHERE indicator_id=%s GROUP BY region_id, obs_date", (ind_id,))
    maxrev = {(rid, d): r for rid, d, r in cur.fetchall()}
    return rev0, maxrev


def _write(cur, ind_id, rid, obs_date, wage, release, rev0, maxrev, tally):
    key = (rid, obs_date)
    if key not in rev0:
        cur.execute(
            "INSERT INTO observations (indicator_id, region_id, obs_date, value, revision, release_date) "
            "VALUES (%s,%s,%s,%s,0,%s) ON CONFLICT DO NOTHING",
            (ind_id, rid, obs_date, wage, release))
        tally["ins"] += 1
    elif float(rev0[key]) != float(wage):
        nr = (maxrev.get(key, 0) or 0) + 1
        cur.execute(
            "INSERT INTO observations (indicator_id, region_id, obs_date, value, revision, release_date) "
            "VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
            (ind_id, rid, obs_date, wage, nr, release))
        tally["rev"] += 1
    else:
        tally["skip"] += 1


def main():
    db = os.environ.get("SUPABASE_DB_URL")
    if not db:
        sys.exit("ERROR: SUPABASE_DB_URL must be set")
    release = dt.date.today()
    conn = psycopg2.connect(db); conn.autocommit = False
    try:
        with conn.cursor() as cur:
            county_id = _indicator_id(cur, COUNTY_SLUG)
            metro_id = _indicator_id(cur, METRO_SLUG)

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

            # Metro key = CBSA code, the same key BLS CES/LAUS metro series use.
            cur.execute("SELECT code, id FROM regions WHERE region_type='metro'")
            metro_rid = {c: i for c, i in cur.fetchall()}

            c_rev0, c_maxrev = _existing(cur, county_id)
            m_rev0, m_maxrev = _existing(cur, metro_id)
            ct = {"ins": 0, "rev": 0, "skip": 0}
            mt = {"ins": 0, "rev": 0, "skip": 0}

            for (year, qtr) in quarters_back(3):
                data = fetch_quarter(year, qtr)
                if not data["county"] and not data["metro"]:
                    continue
                obs_date = dt.date(year, *map(int, QEND[str(qtr)].split("-")))
                for fips, wage in data["county"]:
                    rid = county_rid.get(fips)
                    if rid:
                        _write(cur, county_id, rid, obs_date, wage, release, c_rev0, c_maxrev, ct)
                for cbsa, wage in data["metro"]:
                    rid = metro_rid.get(cbsa)
                    if rid:
                        _write(cur, metro_id, rid, obs_date, wage, release, m_rev0, m_maxrev, mt)
                print(f"  {year}Q{qtr}: {len(data['county'])} counties, {len(data['metro'])} metros")

            cur.execute("SET statement_timeout = 0")
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_indicator_analytics;")
        conn.commit()
        print(f"QCEW county — inserted {ct['ins']}, revised {ct['rev']}, unchanged {ct['skip']}")
        print(f"QCEW metro  — inserted {mt['ins']}, revised {mt['rev']}, unchanged {mt['skip']}")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
