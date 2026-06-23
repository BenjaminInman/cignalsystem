#!/usr/bin/env python3
"""
Cignal System — BLS ingestion (metro total nonfarm employment).

BLS CES State & Metro Area (SM) publishes total nonfarm employment by metro, and
its 5-digit area codes ARE CBSA codes, so they map straight onto our Census CBSA
metro regions. We take the seasonally-adjusted, all-employees series for total
nonfarm (supersector 00 / industry 00000000 / data type 01):

    series_id = SMS{state}{cbsa}0000000001

The catalog (sm.series) is re-derived each run so new metros are picked up
automatically. Only a short recent window is pulled (CES revises recent months),
and values are written on the revision model, so the job no-ops on unchanged data.

Env:  BLS_API_KEY, SUPABASE_DB_URL
Deps: pip install psycopg2-binary requests
"""
import os, sys, json, calendar, datetime as dt
import requests, psycopg2

UA = "CignalSystem/1.0 (ben@benjamininman.com)"
CATALOG = "https://download.bls.gov/pub/time.series/sm/sm.series"
API = "https://api.bls.gov/publicAPI/v2/timeseries/data/"
INDICATOR = "bls_metro_employment"
RECENT_YEARS = 2  # CES revises recent months; re-pull current + prior year


def month_end(y, m):
    return dt.date(y, m, calendar.monthrange(y, m)[1])


def derive_series():
    """Return {series_id: cbsa} for SA total-nonfarm all-employees metro series."""
    r = requests.get(CATALOG, headers={"User-Agent": UA}, timeout=120)
    r.raise_for_status()
    out = {}
    lines = r.text.splitlines()
    for line in lines[1:]:
        f = line.split("\t")
        if len(f) < 7:
            continue
        sid = f[0].strip()
        state, area, supersector, industry, dtype, seasonal = f[1], f[2], f[3], f[4], f[5], f[6].strip()
        if supersector == "00" and industry == "00000000" and dtype == "01" and seasonal == "S":
            if area != "00000":           # skip statewide
                out[sid] = area
    return out


def main():
    key = os.environ.get("BLS_API_KEY")
    db = os.environ.get("SUPABASE_DB_URL")
    if not key or not db:
        sys.exit("ERROR: BLS_API_KEY and SUPABASE_DB_URL must both be set")
    s2area = derive_series()
    if not s2area:
        sys.exit("ERROR: no series derived from BLS catalog")
    this_year = dt.date.today().year
    start = str(this_year - RECENT_YEARS + 1)
    end = str(this_year)
    release = dt.date.today()

    conn = psycopg2.connect(db); conn.autocommit = False
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT code, id FROM regions "
                        "WHERE region_type='metro' AND code ~ '^[0-9]{5}$'")
            rmap = {c: i for c, i in cur.fetchall()}
            cur.execute("SELECT id FROM indicators WHERE slug=%s", (INDICATOR,))
            row = cur.fetchone()
            if not row:
                sys.exit(f"ERROR: indicator {INDICATOR} not registered")
            iid = row[0]

            ids = [s for s, a in s2area.items() if a in rmap]
            ins = skip = 0
            for i in range(0, len(ids), 50):
                batch = ids[i:i + 50]
                body = {"seriesid": batch, "startyear": start, "endyear": end,
                        "registrationkey": key}
                resp = requests.post(API, json=body, timeout=120).json()
                if resp.get("status") != "REQUEST_SUCCEEDED":
                    print(f"  batch {i//50}: {resp.get('status')} {resp.get('message')}")
                    continue
                for s in resp["Results"]["series"]:
                    rid = rmap.get(s2area.get(s["seriesID"]))
                    if not rid:
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
                        cur.execute("SELECT value, revision FROM observations "
                                    "WHERE indicator_id=%s AND region_id=%s AND obs_date=%s "
                                    "ORDER BY revision DESC LIMIT 1", (iid, rid, od))
                        prev = cur.fetchone()
                        if prev is None:
                            cur.execute("INSERT INTO observations"
                                        "(indicator_id,region_id,obs_date,value,revision,release_date)"
                                        " VALUES(%s,%s,%s,%s,0,%s)", (iid, rid, od, val, release)); ins += 1
                        elif float(prev[0]) != val:
                            cur.execute("INSERT INTO observations"
                                        "(indicator_id,region_id,obs_date,value,revision,release_date)"
                                        " VALUES(%s,%s,%s,%s,%s,%s)",
                                        (iid, rid, od, val, prev[1] + 1, release)); ins += 1
                        else:
                            skip += 1
            print(f"BLS metro employment: inserted {ins}, unchanged {skip}, metros {len(ids)}")
            cur.execute("REFRESH MATERIALIZED VIEW mv_indicator_analytics;")
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
