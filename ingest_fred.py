#!/usr/bin/env python3
"""
Cignal System — FRED ingestion (national series), vintage-aware.
Keeps the Supabase observations table current for every indicator whose
source = 'FRED'. Dynamically picks them up by reading indicators.source_series
(the FRED series IDs already stored), so adding a new FRED indicator row is
all that's needed to include it here.

Same revision model as ZORI: first sighting of a (indicator, national, date)
-> revision 0 (first print, kept forever); a value FRED has revised -> next
revision; unchanged -> skipped. Refreshes mv_indicator_analytics at the end.

Env:  FRED_API_KEY, SUPABASE_DB_URL (Session pooler URI)
Deps: pip install psycopg2-binary requests
"""
import io, os, sys, time, datetime as dt
import requests, psycopg2

FRED_URL = "https://api.stlouisfed.org/fred/series/observations"


def fred_get(params, timeout=60, max_tries=5):
    """GET with backoff on 429/5xx. FRED caps at 120 req/min per key; a busy
    scheduled slot can trip it mid-run. Previously the raw raise_for_status()
    turned a single 429 into a whole-run failure -- which is exactly why the
    13:5x scheduled runs failed intermittently while quieter manual dispatches
    succeeded. Honor Retry-After when present, otherwise exponential backoff."""
    for attempt in range(max_tries):
        r = requests.get(FRED_URL, params=params, timeout=timeout)
        if r.status_code == 429 or r.status_code >= 500:
            if attempt == max_tries - 1:
                r.raise_for_status()
            wait = float(r.headers.get("Retry-After", 0)) or (2 ** attempt)
            time.sleep(min(wait, 30))
            continue
        r.raise_for_status()
        return r
    return r  # unreachable, but keeps the type obvious


def fetch_fred(series_id, key):
    r = fred_get({
        "series_id": series_id, "api_key": key, "file_type": "json",
    })
    rows = []
    for o in r.json().get("observations", []):
        v = o.get("value")
        if v in (None, ".", ""):       # FRED uses "." for missing
            continue
        try:
            rows.append((o["date"], float(v)))
        except ValueError:
            continue
    return rows


def fetch_release_dates(series_id, key):
    """Map obs_date -> the date the value was FIRST published (ALFRED vintages).

    Bounded to a recent realtime window so daily series stay small and don't 400.
    The cron only inserts new/changed observations, which are recent, so recent
    vintages are all we need. Anything whose first release predates the window is
    treated as unknown (caller falls back to today()). Best-effort: on any error
    we return {} and the caller uses today()."""
    floor = (dt.date.today() - dt.timedelta(days=450)).isoformat()
    try:
        r = fred_get({
            "series_id": series_id, "api_key": key, "file_type": "json",
            "output_type": 4, "realtime_start": floor, "realtime_end": "9999-12-31",
        })
        first = {}
        for o in r.json().get("observations", []):
            d, rs = o.get("date"), o.get("realtime_start")
            if not d or not rs or rs <= floor:   # rs == floor => released before our window
                continue
            if d not in first or rs < first[d]:
                first[d] = rs
        return first
    except Exception:
        return {}


# Derived series: computed from stored legs rather than pulled from FRED.
# (target, left, right) -> target = left - right
DERIVED = [
    ("baa_aaa_spread", "baa_yield", "aaa_yield"),
]


def derive_spreads(cur, nat):
    """Recompute derived spreads from their stored legs.

    The legs are ordinary FRED series ingested above with first prints intact;
    the spread is recomputed from whatever the legs currently say. It follows
    the same insert-if-changed + revision policy as a primary series, so a
    revised leg produces a NEW revision of the spread rather than overwriting
    the original — the derivation stays auditable against its inputs.

    Only revision-0 legs are read, so a spread is always the difference of two
    first prints and never silently mixes a first print with a restatement."""
    for target, left, right in DERIVED:
        cur.execute("SELECT slug, id FROM indicators WHERE slug = ANY(%s)", ([target, left, right],))
        ids = dict(cur.fetchall())
        if len(ids) < 3:
            print(f"  [derived {target}] skipped - missing leg")
            continue
        cur.execute("""
            INSERT INTO observations (indicator_id, region_id, obs_date, value, revision, release_date)
            SELECT %(t)s, %(nat)s, lo.obs_date, lo.value - ro.value,
                   COALESCE(latest.revision + 1, 0),
                   GREATEST(lo.release_date, ro.release_date)
            FROM observations lo
            JOIN observations ro
              ON ro.indicator_id = %(r)s AND ro.region_id = %(nat)s
             AND ro.revision = 0 AND ro.obs_date = lo.obs_date
            LEFT JOIN LATERAL (
                SELECT o.value, o.revision FROM observations o
                WHERE o.indicator_id = %(t)s AND o.region_id = %(nat)s AND o.obs_date = lo.obs_date
                ORDER BY o.revision DESC LIMIT 1
            ) latest ON true
            WHERE lo.indicator_id = %(l)s AND lo.region_id = %(nat)s AND lo.revision = 0
              AND latest.value IS DISTINCT FROM (lo.value - ro.value);
        """, {"t": ids[target], "l": ids[left], "r": ids[right], "nat": nat})
        print(f"  [derived {target}] {cur.rowcount} inserted")


def main():
    key = os.environ.get("FRED_API_KEY")
    db  = os.environ.get("SUPABASE_DB_URL")
    if not key or not db:
        sys.exit("ERROR: FRED_API_KEY and SUPABASE_DB_URL must both be set")
    release = dt.date.today()   # fallback only, when ALFRED has no vintage for an obs
    conn = psycopg2.connect(db); conn.autocommit = False
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM regions WHERE region_type='national' AND code='US'")
            row = cur.fetchone()
            if not row:
                sys.exit("ERROR: national/US region not found — run the geography migration first")
            nat = row[0]
            cur.execute("SELECT id, slug, source_series FROM indicators WHERE source = 'FRED' ORDER BY slug")
            inds = cur.fetchall()
            print(f"FRED ingestion — release_date {release} | {len(inds)} indicators")
            # Each indicator issues 2 FRED calls (observations + release dates).
            # ~74 indicators -> ~148 calls; FRED caps at 120/min per key. Pace to
            # ~100/min so a normal run stays comfortably under, with fred_get's
            # backoff as the backstop for any burst.
            for ind_id, slug, sid in inds:
                time.sleep(1.2)
                rows = fetch_fred(sid, key)
                if not rows:
                    print(f"  [{slug}] {sid}: no observations"); continue
                reldates = fetch_release_dates(sid, key)   # obs_date -> true first release
                cur.execute("DROP TABLE IF EXISTS _fred_stage;")
                cur.execute("CREATE TEMP TABLE _fred_stage (obs_date date, value numeric, release_date date);")
                buf = io.StringIO()
                for d, v in rows:
                    buf.write(f"{d},{v},{reldates.get(d, '')}\n")   # empty -> NULL -> today() fallback
                buf.seek(0)
                cur.copy_expert("COPY _fred_stage (obs_date, value, release_date) FROM STDIN WITH CSV", buf)
                cur.execute("""
                    INSERT INTO observations (indicator_id, region_id, obs_date, value, revision, release_date)
                    SELECT %(ind)s, %(nat)s, s.obs_date, s.value,
                           COALESCE(latest.revision + 1, 0),
                           COALESCE(s.release_date, %(rel)s)
                    FROM _fred_stage s
                    LEFT JOIN LATERAL (
                        SELECT o.value, o.revision FROM observations o
                        WHERE o.indicator_id = %(ind)s AND o.region_id = %(nat)s AND o.obs_date = s.obs_date
                        ORDER BY o.revision DESC LIMIT 1
                    ) latest ON true
                    WHERE latest.value IS DISTINCT FROM s.value;
                """, {"ind": ind_id, "nat": nat, "rel": release})
                print(f"  [{slug}] {sid}: {len(rows)} pulled, {cur.rowcount} inserted")
        with conn.cursor() as cur:
            derive_spreads(cur, nat)
        conn.commit(); print("Done. Committed.")
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("SET statement_timeout = 0")
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_indicator_analytics;")
        print("Refreshed mv_indicator_analytics.")
    except Exception:
        conn.rollback(); print("Rolled back — no partial writes."); raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
