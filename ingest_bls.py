#!/usr/bin/env python3
"""
Cignal System — BLS ingestion (metro labor + rent-CPI), three series in one job.

All three BLS metro series key off CBSA codes, so they land on the same Census
CBSA metro regions as everything else:

  bls_metro_employment   CES State & Metro (SM)  SMS{state}{cbsa}0000000001   SA, thousands
  bls_metro_unemployment LAUS (LA)               LAUMT{state}{cbsa}00000003   NSA, percent
  bls_metro_cpi_rent     CPI-U rent (CU)         CUUR{cpi_area}SEHA           NSA index, ~20 metros

CES and LAUS catalogs are re-derived from BLS each run (new metros picked up
automatically); the CPI metro set is a fixed ~20-metro map (CPI publishes rent
for a small, stable list of large metros). Only a short recent window is pulled
(BLS revises recent months) and everything is written on the revision model, so
the job no-ops on unchanged values.

Env:  BLS_API_KEY, SUPABASE_DB_URL
Deps: pip install psycopg2-binary requests
"""
import os, sys, calendar, datetime as dt
import requests, psycopg2

UA = "CignalSystem/1.0 (ben@benjamininman.com)"
SM_CATALOG = "https://download.bls.gov/pub/time.series/sm/sm.series"
LA_AREA = "https://download.bls.gov/pub/time.series/la/la.area"
API = "https://api.bls.gov/publicAPI/v2/timeseries/data/"
RECENT_YEARS = 2

# CPI-U rent of primary residence (SEHA) publishes for a small fixed metro set;
# current S-prefixed CPI areas map 1:1 to CBSAs (legacy A-prefixed areas are
# discontinued). series_id = CUUR{area}SEHA
CPI_AREA_CBSA = {
    "S11A": "14460", "S12A": "35620", "S12B": "37980", "S23A": "16980",
    "S23B": "19820", "S24A": "33460", "S24B": "41180", "S35A": "47900",
    "S35B": "33100", "S35C": "12060", "S35D": "45300", "S35E": "12580",
    "S37A": "19100", "S37B": "26420", "S48A": "38060", "S48B": "19740",
    "S49A": "31080", "S49B": "41860", "S49C": "40140", "S49E": "41740",
}


def month_end(y, m):
    return dt.date(y, m, calendar.monthrange(y, m)[1])


def ces_series():
    """{series_id: cbsa} for SA total-nonfarm all-employees metro series."""
    r = requests.get(SM_CATALOG, headers={"User-Agent": UA}, timeout=120)
    r.raise_for_status()
    out = {}
    for line in r.text.splitlines()[1:]:
        f = line.split("\t")
        if len(f) < 7:
            continue
        sid = f[0].strip()
        if f[3] == "00" and f[4] == "00000000" and f[5] == "01" and f[6].strip() == "S" and f[2] != "00000":
            out[sid] = f[2]
    return out


def laus_series():
    """{series_id: cbsa} for NSA metro unemployment-rate series (measure 03)."""
    r = requests.get(LA_AREA, headers={"User-Agent": UA}, timeout=120)
    r.raise_for_status()
    out = {}
    for line in r.text.splitlines()[1:]:
        f = line.split("\t")
        if len(f) < 2 or f[0] != "B":      # B = metropolitan statistical area
            continue
        ac = f[1]                          # MT{state2}{cbsa5}000000
        out["LAU" + ac + "03"] = ac[4:9]
    return out


def main():
    key = os.environ.get("BLS_API_KEY")
    db = os.environ.get("SUPABASE_DB_URL")
    if not key or not db:
        sys.exit("ERROR: BLS_API_KEY and SUPABASE_DB_URL must both be set")

    # series_id -> (indicator_slug, cbsa)
    smap = {}
    for sid, cb in ces_series().items():
        smap[sid] = ("bls_metro_employment", cb)
    for sid, cb in laus_series().items():
        smap[sid] = ("bls_metro_unemployment", cb)
    for area, cb in CPI_AREA_CBSA.items():
        smap["CUUR" + area + "SEHA"] = ("bls_metro_cpi_rent", cb)
    if not smap:
        sys.exit("ERROR: no BLS series derived")

    this_year = dt.date.today().year
    start, end = str(this_year - RECENT_YEARS + 1), str(this_year)
    release = dt.date.today()

    conn = psycopg2.connect(db); conn.autocommit = False
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT code, id FROM regions WHERE region_type='metro' AND code ~ '^[0-9]{5}$'")
            rmap = {c: i for c, i in cur.fetchall()}
            cur.execute("SELECT slug, id FROM indicators WHERE slug IN "
                        "('bls_metro_employment','bls_metro_unemployment','bls_metro_cpi_rent')")
            ind = {s: i for s, i in cur.fetchall()}

            ids = [sid for sid, (slug, cb) in smap.items() if cb in rmap and slug in ind]
            ins = skip = 0
            for i in range(0, len(ids), 50):
                body = {"seriesid": ids[i:i + 50], "startyear": start, "endyear": end,
                        "registrationkey": key}
                resp = requests.post(API, json=body, timeout=120).json()
                if resp.get("status") != "REQUEST_SUCCEEDED":
                    print(f"  batch {i//50}: {resp.get('status')} {resp.get('message')}")
                    continue
                for s in resp["Results"]["series"]:
                    slug, cb = smap.get(s["seriesID"], (None, None))
                    iid, rid = ind.get(slug), rmap.get(cb)
                    if not iid or not rid:
                        continue
                    for d in s["data"]:
                        p = d["period"]
                        if not p.startswith("M") or p == "M13":
                            continue
                        od = month_end(int(d["year"]), int(p[1:]))
                        try:
                            val = float(d["value"].replace(",", ""))
                        except ValueError:
                            continue
                        cur.execute("SELECT value, revision FROM observations WHERE indicator_id=%s "
                                    "AND region_id=%s AND obs_date=%s ORDER BY revision DESC LIMIT 1",
                                    (iid, rid, od))
                        prev = cur.fetchone()
                        if prev is None:
                            cur.execute("INSERT INTO observations(indicator_id,region_id,obs_date,value,revision,release_date)"
                                        " VALUES(%s,%s,%s,%s,0,%s)", (iid, rid, od, val, release)); ins += 1
                        elif float(prev[0]) != val:
                            cur.execute("INSERT INTO observations(indicator_id,region_id,obs_date,value,revision,release_date)"
                                        " VALUES(%s,%s,%s,%s,%s,%s)", (iid, rid, od, val, prev[1] + 1, release)); ins += 1
                        else:
                            skip += 1
            print(f"BLS: inserted {ins}, unchanged {skip}, series {len(ids)}")
            cur.execute("REFRESH MATERIALIZED VIEW mv_indicator_analytics;")
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
