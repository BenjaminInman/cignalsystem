#!/usr/bin/env python3
"""
Cignal System — Census PEP metro net migration.

Two indicators, kept strictly separate (never blended):
  pep_net_domestic_migration      metro-to-metro net domestic migration (persons)
  pep_net_international_migration net international migration (persons)

Both annual, metro grain, keyed by CBSA — the same canonical metro keying used
by the BLS metro series, so they join cleanly.

Why these are separate series, not one "net migration" number: they are
different demand drivers. Domestic migration moves renters between US metros —
it is the metro-vs-metro competition signal. International migration lands
disproportionately in gateway markets and is driven by federal policy, not by
local fundamentals. Census's own 2025 reporting is the case in point: a sharp
fall in international migration is what flipped New York's domestic number
positive for the first time since 2016. Averaging them would erase exactly the
distinction that matters.

Source: Population Estimates Program, metro components-of-change file.
  https://www2.census.gov/programs-surveys/popest/datasets/2020-{V}/metro/totals/cbsa-est{V}-alldata.csv
Public domain (citation requested), no API key, one CSV carries the full
vintage window. Vintage V is the July-1 reference year; the metro/county file
lands each March (the Vintage 2025 file published March 2026).

Cadence note: PEP is annual, and that is not a compromise. Empirically migration
leads multifamily permits by 1-2 years (r ~ +0.28), so an ~8-month publication
lag still leaves real runway. There is no free monthly measurement of migration
at metro grain — the monthly "migration indices" on the market are proxies
(one-way truck rentals, change-of-address, search intent), measure a different
construct, are dominated by moving-season seasonality, and are proprietary.

Env: SUPABASE_DB_URL
"""

import csv
import io
import os
import datetime as dt
import urllib.request

import psycopg2

DB_URL = os.environ["SUPABASE_DB_URL"]
UA = {"User-Agent": "CignalSystem/1.0 (info@cignalsystem.com)"}

BASE = "https://www2.census.gov/programs-surveys/popest/datasets"

INDICATORS = {
    "pep_net_domestic_migration": dict(
        name="Net Domestic Migration — Metro (Census PEP)",
        units="persons",
        classification="leading",
        col="DOMESTICMIG",
        higher_is_better=True,
    ),
    "pep_net_international_migration": dict(
        name="Net International Migration — Metro (Census PEP)",
        units="persons",
        classification="leading",
        col="INTERNATIONALMIG",
        higher_is_better=True,
    ),
}

# A metro's net domestic migration has never plausibly exceeded a few hundred
# thousand in a single year (the largest observed outflow is New York at about
# -168k). Anything past this band means the file layout moved, not that a metro
# gained a million people; drop it rather than store nonsense.
MIG_ABS_MAX = 1_000_000


def vintage_url(v):
    return f"{BASE}/2020-{v}/metro/totals/cbsa-est{v}-alldata.csv"


def fetch(url, timeout=90):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read()


def latest_vintage(today=None):
    """The metro file for vintage V publishes in March of V+1. Walk back from the
    current year until a file actually exists so a late release can't break the run."""
    today = today or dt.date.today()
    start = today.year - 1 if today.month >= 3 else today.year - 2
    for v in range(start, start - 3, -1):
        try:
            data = fetch(vintage_url(v), timeout=45)
            if len(data) > 10_000:
                return v, data
        except Exception as e:  # noqa: BLE001
            print(f"  vintage {v} unavailable: {str(e)[:60]}")
    raise RuntimeError("no PEP metro vintage reachable")


def parse(data):
    """Return {cbsa: {slug: {year: value}}} for Metropolitan Statistical Areas only.

    The file also carries Micropolitan areas and metropolitan *divisions*; both
    are excluded. Divisions are sub-metro splits (e.g. New York is divided) and
    including them would double-count their parent metro.
    """
    rows = list(csv.DictReader(io.StringIO(data.decode("latin-1"))))
    out = {}
    for r in rows:
        if r.get("LSAD", "").strip() != "Metropolitan Statistical Area":
            continue
        cbsa = r["CBSA"].strip()
        per_slug = {}
        for slug, meta in INDICATORS.items():
            vals = {}
            for k, v in r.items():
                if not k.startswith(meta["col"]):
                    continue
                yr = k[len(meta["col"]):]
                if not yr.isdigit() or len(yr) != 4:
                    continue
                if v in (None, "", "."):
                    continue
                try:
                    n = int(float(v))
                except ValueError:
                    continue
                if abs(n) > MIG_ABS_MAX:
                    print(f"  SKIP {slug} {cbsa} {yr}: {n} outside sane band")
                    continue
                vals[int(yr)] = n
            if vals:
                per_slug[slug] = vals
        if per_slug:
            out[cbsa] = per_slug
    return out


def ensure_indicators(cur):
    ids = {}
    for slug, meta in INDICATORS.items():
        cur.execute("SELECT id FROM indicators WHERE slug=%s", (slug,))
        row = cur.fetchone()
        if row:
            ids[slug] = row[0]
            continue
        cur.execute(
            """INSERT INTO indicators (slug,name,frequency,units,source,source_series,
                                       classification,higher_is_better,is_public,verticals)
               VALUES (%s,%s,'annual',%s,'Census PEP',%s,%s,%s,true,ARRAY['multifamily'])
               RETURNING id""",
            (slug, meta["name"], meta["units"], meta["col"],
             meta["classification"], meta["higher_is_better"]),
        )
        ids[slug] = cur.fetchone()[0]
        print(f"created indicator {slug}")
    return ids


def metro_region_ids(cur):
    """CBSA-coded metro regions only — the same keying the BLS metro series use."""
    cur.execute("SELECT code, id FROM regions WHERE region_type='metro' AND code ~ '^[0-9]{5}$' AND retired_at IS NULL")
    return {c: i for c, i in cur.fetchall()}


def insert_if_changed(cur, indicator_id, region_id, obs_date, value):
    cur.execute(
        """SELECT value FROM observations
           WHERE indicator_id=%s AND region_id=%s AND obs_date=%s AND revision=0""",
        (indicator_id, region_id, obs_date),
    )
    row = cur.fetchone()
    if row is not None:
        if abs(float(row[0]) - value) < 1e-9:
            return "unchanged"
        # PEP revises prior years with each vintage. Revision-0 first prints are
        # preserved permanently; a changed value lands as a new revision.
        cur.execute(
            """INSERT INTO observations (indicator_id, region_id, obs_date, value, revision)
               VALUES (%s,%s,%s,%s,(SELECT COALESCE(MAX(revision),0)+1 FROM observations
                       WHERE indicator_id=%s AND region_id=%s AND obs_date=%s))""",
            (indicator_id, region_id, obs_date, value, indicator_id, region_id, obs_date),
        )
        return "revised"
    cur.execute(
        """INSERT INTO observations (indicator_id, region_id, obs_date, value, revision)
           VALUES (%s,%s,%s,%s,0)""",
        (indicator_id, region_id, obs_date, value),
    )
    return "inserted"


def main():
    vintage, data = latest_vintage()
    print(f"PEP vintage {vintage}")
    panel = parse(data)
    print(f"parsed {len(panel)} Metropolitan Statistical Areas")

    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    counts = {"inserted": 0, "revised": 0, "unchanged": 0}
    unmatched = set()
    try:
        with conn.cursor() as cur:
            ids = ensure_indicators(cur)
            regions = metro_region_ids(cur)
            for cbsa, per_slug in panel.items():
                rid = regions.get(cbsa)
                if not rid:
                    unmatched.add(cbsa)
                    continue
                for slug, vals in per_slug.items():
                    for yr, v in vals.items():
                        # PEP estimates are as of July 1; store at the year end so
                        # the annual grain lines up with the other annual series.
                        r = insert_if_changed(cur, ids[slug], rid, dt.date(yr, 12, 31), v)
                        counts[r] += 1
        if counts["inserted"] or counts["revised"]:
            with conn.cursor() as cur:
                cur.execute("SET statement_timeout = 0")
                cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_indicator_analytics")
            print("refreshed mv_indicator_analytics")
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    print(f"inserted={counts['inserted']} revised={counts['revised']} unchanged={counts['unchanged']}")
    if unmatched:
        print(f"{len(unmatched)} CBSAs in PEP with no matching metro region (e.g. {sorted(unmatched)[:5]})")


if __name__ == "__main__":
    main()
