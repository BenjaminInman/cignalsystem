"""Apartment List ingest — national + metro (CBSA) rent, vacancy, time-on-market.

Scrapes the current month's CSV links from Apartment List's data page (the
Contentful asset URLs change every release), melts wide -> long, and writes
insert-if-changed against the latest revision: revision 0 is the first print and
is never touched; Apartment List back-revisions land as revision n+1.

Units match the June 2026 seed load:
  apt_rent_estimate   USD, bed_size='overall'
  apt_vacancy         percent (CSV fraction x 100)
  apt_time_on_market  days
obs_date = month-end.
"""
import datetime as dt, io, os, re, sys
import pandas as pd, psycopg2, requests
from psycopg2.extras import execute_values

PAGE = "https://www.apartmentlist.com/research/category/data-rent-estimates"
UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}
SERIES = [
    ("apt_rent_estimate",  r"Apartment_List_Rent_Estimates_(\d{4})_(\d{2})\.csv", 1.0,   "overall"),
    ("apt_vacancy",        r"Apartment_List_Vacancy_Index_(\d{4})_(\d{2})\.csv",  100.0, None),
    ("apt_time_on_market", r"Apartment_List_Time_On_Market_(\d{4})_(\d{2})\.csv", 1.0,   None),
]


def find_urls():
    r = requests.get(PAGE, headers=UA, timeout=60)
    html = r.text.replace("\\u002F", "/").replace("\\/", "/")
    links = set(re.findall(r'(?:https:)?//(?:assets|downloads)\.ctfassets\.net/[^"\'\s<>\\]+?\.csv', html))
    if not links:
        print(f"page fetch: HTTP {r.status_code}, {len(r.text):,} bytes; head: {r.text[:300]!r}")
    out = {}
    for slug, pat, *_ in SERIES:
        hits = sorted(((m.group(1) + m.group(2), l) for l in links if (m := re.search(pat, l))), reverse=True)
        if not hits:
            sys.exit(f"ERROR: no CSV link found for {slug} on {PAGE}")
        u = hits[0][1]
        out[slug] = u if u.startswith("http") else "https:" + u
    return out


def melt(url, scale, bed):
    df = pd.read_csv(io.StringIO(requests.get(url, headers=UA, timeout=120).text))
    if bed:
        df = df[df["bed_size"] == bed]
    df = df[df["location_type"].isin(["National", "Metro"])].copy()
    df["code"] = df.apply(lambda r: "US" if r["location_type"] == "National"
                          else str(int(r["location_fips_code"])).zfill(5), axis=1)
    df["rtype"] = df["location_type"].map({"National": "national", "Metro": "metro"})
    months = [c for c in df.columns if re.fullmatch(r"\d{4}_\d{2}", c)]
    long = df.melt(id_vars=["rtype", "code"], value_vars=months, var_name="ym", value_name="value").dropna()
    p = pd.PeriodIndex(long["ym"].str.replace("_", "-"), freq="M")
    long["obs_date"] = p.to_timestamp(how="end").date
    long["value"] = long["value"].astype(float) * scale
    return long[["rtype", "code", "obs_date", "value"]]


def main():
    db = os.environ.get("SUPABASE_DB_URL") or sys.exit("ERROR: SUPABASE_DB_URL not set")
    urls = find_urls()
    release = dt.date.today()
    print(f"Apartment List ingest — release_date {release}")
    conn = psycopg2.connect(db); conn.autocommit = False
    try:
        with conn.cursor() as cur:
            cur.execute("SET LOCAL statement_timeout = 0")
            for slug, _pat, scale, bed in SERIES:
                print(f"\n[{slug}] {urls[slug].rsplit('/', 1)[-1]}")
                long = melt(urls[slug], scale, bed)
                print(f"  -> {len(long):,} obs, {long['code'].nunique()} regions, through {long['obs_date'].max()}")
                cur.execute("SELECT id FROM indicators WHERE slug=%s", (slug,))
                ind = (cur.fetchone() or sys.exit(f"ERROR: {slug} not registered"))[0]
                cur.execute("DROP TABLE IF EXISTS _al; CREATE TEMP TABLE _al (rtype text, code text, obs_date date, value numeric)")
                execute_values(cur, "INSERT INTO _al VALUES %s", list(long.itertuples(index=False, name=None)), page_size=5000)
                cur.execute("""
                    INSERT INTO observations (indicator_id, region_id, obs_date, value, revision, release_date)
                    SELECT %(ind)s, r.id, s.obs_date, s.value, COALESCE(latest.revision + 1, 0), %(rel)s
                      FROM _al s
                      JOIN regions r ON r.region_type = s.rtype AND r.code = s.code AND r.retired_at IS NULL
                      LEFT JOIN LATERAL (
                            SELECT o.value, o.revision FROM observations o
                             WHERE o.indicator_id = %(ind)s AND o.region_id = r.id AND o.obs_date = s.obs_date
                             ORDER BY o.revision DESC LIMIT 1) latest ON true
                     WHERE latest.value IS NULL OR abs(latest.value - s.value) > 0.0005""", {"ind": ind, "rel": release})
                print(f"  inserted {cur.rowcount:,} rows (first prints + revisions; unchanged skipped)")
        conn.commit(); print("\nCommitted.")
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("SET statement_timeout = 0")
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_indicator_analytics")
        print("Refreshed mv_indicator_analytics.")
    except Exception:
        conn.rollback(); print("Rolled back — no partial writes."); raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
