#!/usr/bin/env python3
"""
Cignal System - metro-grain HelloData exports, batched by metric.

The ceiling on HelloData exports is columns x data volume, not market size
alone (Aug 2026: New York's metro export failed with five metrics and delivered
with one). Since access was restored in Nov 2026 the same limit bites much
lower: Columbus, OH (235k units) metro-grain market-rate with all five metrics
was accepted and never delivered, while one metric delivered in minutes.

So the metro series for the large segments (all-in, mkt) are fired with the
metrics grouped by metro size, the same tiering used in August:

    units <  HD_SMALL  (default 120k)   all 5 metrics in one export
    units <  HD_MID    (default 400k)   2-3 metrics per export
    larger                              one metric per export

A metric is pending for a metro until it has an observation at HD_REFRESH_MONTH,
so re-running only fires what is still missing. HD_MAX_PER_EXPORT caps the group
size for a retry pass (e.g. 1 to split everything that failed).

The ingester skips metric columns absent from a file, so partial files from
different exports combine into the same series. Names route through the drain
as cignal_metro_<code>[_seg].

Env: HELLODATA_API_KEY, SUPABASE_DB_URL, HD_REFRESH_MONTH,
     [HD_FIRE_SEGMENTS=all,mkt] [HD_FIRE_METROS] [HD_FIRE_MINUTES=340]
"""
import os, sys, time, json
import requests, psycopg2

API = "https://api.hellodata.ai/dataset/export"
WEBHOOK = os.environ.get("WEBHOOK_URL", "https://www.cignalsystem.com/api/hellodata/webhook")
MF = {"column": "number_units", "filter": {"greaterThanOrEqualTo": 50}}
def _eq(c, v): return {"column": c, "filter": {"equals": v}}
SEG_FILTERS = {
    None: [MF, _eq("is_affordable", False)],
    "mkt": [MF, _eq("is_affordable", False), _eq("is_student", False), _eq("is_senior", False)],
    "aff": [MF, _eq("is_affordable", True)],
    "stu": [MF, _eq("is_student", True)],
    "sen": [MF, _eq("is_senior", True)],
}
# metric column -> indicator slug stem
METRICS = [("asking_rent", "hd_asking_rent"), ("effective_rent", "hd_effective_rent"),
           ("concession", "hd_concession"), ("leased_percentage", "hd_leased_pct"),
           ("days_on_market", "hd_dom")]
SMALL = int(os.environ.get("HD_SMALL") or "120000")
MID = int(os.environ.get("HD_MID") or "400000")
CAP = int(os.environ.get("HD_MAX_PER_EXPORT") or "5")
BACKOFF = 120


def group_size(units):
    n = 5 if units < SMALL else (3 if units < MID else 1)
    return max(1, min(n, CAP))


def fire(key, name, scopes, filters):
    body = {"dataset": {"scopes": scopes, "filters": filters, "limit": 500000},
            "webhookURL": WEBHOOK, "name": name, "format": "csv"}
    for attempt in range(12):
        r = requests.post(API, headers={"x-api-key": key, "Content-Type": "application/json"},
                          data=json.dumps(body), timeout=90)
        try:
            j = r.json()
        except Exception:
            j = {"raw": r.text[:120]}
        if r.status_code == 429 or "concurrent" in json.dumps(j):
            print(f"    export cap full - waiting {BACKOFF}s", flush=True)
            time.sleep(BACKOFF)
            continue
        return r.status_code, j
    return 429, {"error": "cap stayed full"}


def main():
    key, db = os.environ.get("HELLODATA_API_KEY"), os.environ.get("SUPABASE_DB_URL")
    month = (os.environ.get("HD_REFRESH_MONTH") or "").strip()
    if not (key and db and month):
        sys.exit("ERROR: need HELLODATA_API_KEY, SUPABASE_DB_URL and HD_REFRESH_MONTH")
    segs = [None if s == "all" else s
            for s in (os.environ.get("HD_FIRE_SEGMENTS") or "all,mkt").split(",") if s.strip()]
    only = [x.strip() for x in (os.environ.get("HD_FIRE_METROS") or "").split(",") if x.strip()]
    deadline = time.time() + float(os.environ.get("HD_FIRE_MINUTES") or "340") * 60

    conn = psycopg2.connect(db); conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("""SELECT r.id, r.code, s.msa_label, COALESCE(s.units,0)
                         FROM regions r JOIN hd_metro_size s ON s.region_id=r.id
                        WHERE r.region_type='metro' AND r.retired_at IS NULL
                          AND r.code ~ '^[0-9]{5}$' AND s.msa_label IS NOT NULL
                          AND (%s OR r.code = ANY(%s))
                        ORDER BY s.units DESC""", (not only, only))
        metros = cur.fetchall()

    fired = 0
    for rid, code, label, units in metros:
        for seg in segs:
            suffix = f"_{seg}" if seg else ""
            with conn.cursor() as cur:
                cur.execute("""SELECT i.slug FROM observations o JOIN indicators i ON i.id=o.indicator_id
                                WHERE o.region_id=%s AND o.obs_date=%s::date AND i.slug = ANY(%s)""",
                            (rid, month, [s + suffix for _, s in METRICS]))
                have = {r[0] for r in cur.fetchall()}
            missing = [m for m, s in METRICS if s + suffix not in have]
            if not missing:
                continue
            n = group_size(units)
            for i in range(0, len(missing), n):
                if time.time() > deadline:
                    print(f"time budget spent; fired {fired}"); return
                grp = missing[i:i + n]
                scopes = [{"column": "msa"}, {"column": "as_of_month"}] + \
                         [{"column": m, "aggregate": "Avg"} for m in grp]
                filters = [{"column": "msa", "filter": {"equals": label}}] + SEG_FILTERS[seg]
                st, j = fire(key, f"cignal_metro_{code}{suffix}", scopes, filters)
                print(f"  {code} {label[:34]:36} {units:>9,} {seg or 'all':4} {','.join(grp):58} {st} {j.get('queryUUID') or j}", flush=True)
                if j.get("queryUUID"):
                    fired += 1
                time.sleep(3)
    print(f"done; fired {fired} export(s)")


if __name__ == "__main__":
    main()
