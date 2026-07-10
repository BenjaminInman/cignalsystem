#!/usr/bin/env python3
"""
Cignal System — Census BPS metro multifamily (5+ unit) building permits, annual.
A leading supply signal: permits authorized now become deliveries in ~18-24mo.

Census publishes finalized metro permits in a directory named
'Metro (ending YYYY)/'. This script discovers the latest such directory, loads
the last several annual files (ma{YYYY}a.txt), and upserts with insert-if-changed.
Metros key by CBSA code (numeric), the same geography as the BLS metro series.

Env:  SUPABASE_DB_URL   (Session pooler URI)
Deps: pip install psycopg2-binary requests
"""
import os, sys, io, csv, re, datetime as dt
import requests, psycopg2
from psycopg2.extras import execute_values

BPS_ROOT = "https://www2.census.gov/econ/bps/"
SLUG = "permits_5plus_metro"
NAME = "Building Permits — Multifamily 5+ Units, Metro (annual)"
UA = {"User-Agent": "Mozilla/5.0"}


def latest_metro_dir():
    html = requests.get(BPS_ROOT, headers=UA, timeout=120).text
    years = [int(y) for y in re.findall(r'Metro%20\(ending%20(\d{4})\)/', html)]
    years += [int(y) for y in re.findall(r'Metro \(ending (\d{4})\)/', html)]
    end = max(years)
    return f"{BPS_ROOT}Metro%20%28ending%20{end}%29/", end


def fetch_year(base, year):
    resp = requests.get(f"{base}ma{year}a.txt", headers=UA, timeout=120)
    if resp.status_code != 200:
        return []
    rows = list(csv.reader(io.StringIO(resp.text)))[2:]      # 2 header rows
    out = []
    for r in rows:
        if len(r) < 16:
            continue
        cbsa, name = r[2].strip(), r[4].strip()
        if not cbsa.isdigit():
            continue
        try:
            units_5plus = int(r[15].strip())                 # col 15 = "5+ units / Units"
        except ValueError:
            continue
        out.append((cbsa, name, year, units_5plus))
    return out


def ensure_indicator(cur):
    cur.execute("SELECT id FROM indicators WHERE slug = %s", (SLUG,))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute(
        """INSERT INTO indicators (slug, name, source, source_series, frequency, units,
                                   classification, higher_is_better, is_public)
           VALUES (%s,%s,%s,%s,%s,%s,%s::public.indicator_class,%s,%s) RETURNING id""",
        (SLUG, NAME, "Census BPS", "BPS Metro Annual ma####a 5+ units", "annual",
         "units", "leading", None, True))
    return cur.fetchone()[0]


def main():
    db = os.environ.get("SUPABASE_DB_URL")
    if not db:
        sys.exit("ERROR: SUPABASE_DB_URL not set")
    release = dt.date.today()
    base, end = latest_metro_dir()
    print(f"BPS metro permits — latest finalized year {end}")
    recs = []
    for y in range(end - 5, end + 1):
        yr = fetch_year(base, y)
        print(f"  {y}: {len(yr)} metros")
        recs += yr
    if not recs:
        sys.exit("ERROR: no permit rows fetched")

    conn = psycopg2.connect(db); conn.autocommit = False
    try:
        with conn.cursor() as cur:
            ind = ensure_indicator(cur)
            cbsas = {c: n for c, n, y, u in recs}
            execute_values(cur,
                "INSERT INTO regions (region_type, code, name) VALUES %s "
                "ON CONFLICT (region_type, code) DO NOTHING",
                [("metro", c, n) for c, n in cbsas.items()])
            cur.execute("DROP TABLE IF EXISTS _stage;")
            cur.execute("CREATE TEMP TABLE _stage (code text, obs_date date, value numeric);")
            buf = io.StringIO()
            for c, n, y, u in recs:
                buf.write(f"{c},{y}-12-31,{u}\n")
            buf.seek(0)
            cur.copy_expert("COPY _stage (code, obs_date, value) FROM STDIN WITH CSV", buf)
            cur.execute("""
                INSERT INTO observations (indicator_id, region_id, obs_date, value, revision, release_date)
                SELECT %(ind)s, r.id, s.obs_date, s.value,
                       COALESCE(latest.revision + 1, 0), %(release)s
                FROM _stage s
                JOIN regions r ON r.region_type = 'metro' AND r.code = s.code
                LEFT JOIN LATERAL (
                    SELECT o.value, o.revision FROM observations o
                    WHERE o.indicator_id = %(ind)s AND o.region_id = r.id AND o.obs_date = s.obs_date
                    ORDER BY o.revision DESC LIMIT 1
                ) latest ON true
                WHERE latest.value IS DISTINCT FROM s.value;
            """, {"ind": ind, "release": release})
            print(f"  inserted {cur.rowcount} rows (first prints + revisions; unchanged skipped)")
        conn.commit(); print("\nDone. Committed.")
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("SET statement_timeout = 0")
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_indicator_analytics;")
        print("Refreshed mv_indicator_analytics.")
    except Exception:
        conn.rollback(); print("\nRolled back — no partial writes."); raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
