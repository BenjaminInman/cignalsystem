#!/usr/bin/env python3
"""
Cignal System - HelloData export driver.

Fires Dataset Export jobs one MSA at a time and lets the webhook queue the
results for drain_hellodata.py to ingest.

WHY MSA-BY-MSA. HelloData silently fails on large pricing exports: the request
returns 201 with a queryUUID and the file never arrives, with no error and no
poll endpoint. Measured 2026-08-01:

    Nashville MSA, 38mo history (1,931 rows)      delivered ~3 min
    national coverage, 10,879 rows, NO pricing    delivered ~7 min
    state=TN, pricing, limit 5                    delivered ~4 min
    state=TX, pricing, full history               never arrived
    10-state chunks, pricing, full history        never arrived (x10, twice)

So the ceiling is on pricing-column queries specifically, and it sits below one
state's worth of ZIP-month history. One MSA is the largest unit proven reliable.
Coverage has no pricing columns and can still run nationally in a single job.

Also: HelloData rejects any pricing query without a market filter -
"Queries that include Pricing Columns must be filtered by at least one Market
Column" - so there is no national pricing export to fall back to.

Export names MUST match the drain router: cignal_zip_*, cignal_metro_*.

Env: HELLODATA_API_KEY, SUPABASE_DB_URL, WEBHOOK_URL,
     [HD_FIRE_LIMIT=25] [HD_FIRE_SLEEP=3] [HD_FIRE_MODE=zip|metro|both]
"""
import os, sys, time, json
import requests, psycopg2

API = "https://api.hellodata.ai/dataset/export"
MF = {"column": "number_units", "filter": {"greaterThanOrEqualTo": 50}}
AFF = {"column": "is_affordable", "filter": {"equals": False}}
BACKOFF = int(os.environ.get("HD_FIRE_BACKOFF", "90"))

AVGS = [
    {"column": "asking_rent", "aggregate": "Avg"},
    {"column": "effective_rent", "aggregate": "Avg"},
    {"column": "concession", "aggregate": "Avg"},
    {"column": "leased_percentage", "aggregate": "Avg"},
    {"column": "days_on_market", "aggregate": "Avg"},
]


def hd_label(name):
    """Fallback only. Prefer hd_metro_size.msa_label, which is HelloData's own
    string captured from an MSA-grain export.

    Deriving the label from regions.name does not work: several rows have lost
    their comma ("Dayton  OH" vs HelloData's "Dayton, OH", likewise Cleveland-
    Elyria and Ocean City), and Census-style doubled hyphens differ too. A label
    that does not match exactly is not an error - the export succeeds and returns
    an empty file, which is far worse than failing loudly."""
    return name.replace("--", "-").replace(" (Metropolitan Statistical Area)", "").strip()


def pending_metros(cur, mode, limit):
    """Metros with no HelloData pricing yet, LARGEST FIRST.

    Restricted to the CBSA-coded family (see metro_code_map in
    ingest_hellodata.py): ZORI lives on a parallel name-coded family, and the two
    share names. /api/hellodata queries by CBSA, so anything written to the
    name-coded rows would be invisible to the site.

    Ordered by tracked units so a partial run covers the markets people actually
    search. Metros with no size on file sort last rather than being dropped.
    """
    cur.execute(
        """
        SELECT r.code, COALESCE(s.msa_label, r.name)
          FROM regions r
          LEFT JOIN hd_metro_size s ON s.region_id = r.id
         WHERE r.region_type = 'metro'
           AND r.code ~ '^[0-9]{5}$'
           AND NOT EXISTS (
                 SELECT 1 FROM observations o
                   JOIN indicators i ON i.id = o.indicator_id
                  WHERE i.source = 'HelloData'
                    AND i.slug = 'hd_effective_rent'
                    AND o.region_id = r.id)
           -- Also exclude anything fired recently. "Has no data yet" is NOT the
           -- same as "not yet requested": an export takes minutes to arrive and
           -- the drain runs hourly, so without this every batch re-fires the
           -- previous batch. Observed 2026-08-01 - run 9 duplicated all 25
           -- metros from run 8, burning export quota for zero new rows.
           AND NOT EXISTS (
                 SELECT 1 FROM hd_fired f
                  WHERE f.region_id = r.id
                    AND f.fired_at > now() - interval '20 hours')
         ORDER BY COALESCE(s.units, -1) DESC, r.name
         LIMIT %s
        """,
        (limit,),
    )
    return cur.fetchall()


def fire(key, name, scopes, filters, webhook, limit=500000):
    body = {
        "dataset": {"scopes": scopes, "filters": filters, "limit": limit},
        "webhookURL": webhook,
        "name": name,
        "format": "csv",
    }
    r = requests.post(API, headers={"x-api-key": key, "Content-Type": "application/json"},
                      data=json.dumps(body), timeout=90)
    try:
        j = r.json()
    except Exception:
        j = {"raw": r.text[:200]}
    return r.status_code, j


def main():
    key = os.environ.get("HELLODATA_API_KEY")
    db = os.environ.get("SUPABASE_DB_URL")
    webhook = os.environ.get("WEBHOOK_URL",
                             "https://multifamily.cignalsystem.com/api/hellodata/webhook")
    if not (key and db):
        sys.exit("ERROR: need HELLODATA_API_KEY and SUPABASE_DB_URL")
    limit = int(os.environ.get("HD_FIRE_LIMIT", "25"))
    nap = float(os.environ.get("HD_FIRE_SLEEP", "3"))
    which = os.environ.get("HD_FIRE_MODE", "both")

    conn2 = psycopg2.connect(db)
    conn2.autocommit = True
    with conn2.cursor() as cur:
        metros = pending_metros(cur, which, limit)

    if not metros:
        print("nothing pending — every covered metro already has HelloData pricing")
        return

    print(f"firing {len(metros)} metro(s), mode={which}")
    fired = 0
    for code, name in metros:
        label = hd_label(name)
        mkt = {"column": "msa", "filter": {"equals": label}}
        jobs = []
        if which in ("zip", "both"):
            jobs.append((f"cignal_zip_{code}", [{"column": "zip_code"},
                                                {"column": "as_of_month"}] + AVGS))
        if which in ("metro", "both"):
            jobs.append((f"cignal_metro_{code}", [{"column": "msa"},
                                                  {"column": "as_of_month"}] + AVGS))
        for jname, scopes in jobs:
            st, j = fire(key, jname, scopes, [mkt, MF, AFF], webhook)
            # HelloData caps concurrent exports at 10 and answers 429 beyond it.
            # Back off and retry rather than dropping the market silently.
            tries = 0
            while st == 429 and tries < 8:
                tries += 1
                print(f"    429 (concurrency cap) - waiting {BACKOFF}s, retry {tries}")
                time.sleep(BACKOFF)
                st, j = fire(key, jname, scopes, [mkt, MF, AFF], webhook)
            if st == 429:
                print("    still capped; stopping this batch cleanly")
                conn2.close()
                print(f"fired {fired} export(s) before hitting the concurrency cap.")
                return
            uid = j.get("queryUUID")
            print(f"  {jname:26} {label[:44]:46} {st} {uid or j}")
            if uid:
                fired += 1
                with conn2.cursor() as c2:
                    c2.execute(
                        """INSERT INTO hd_fired (region_id, mode)
                           SELECT id, %s FROM regions
                            WHERE region_type='metro' AND code=%s
                           ON CONFLICT (region_id, mode)
                             DO UPDATE SET fired_at = now()""",
                        (jname.split("_")[1], code),
                    )
            # Deliberate pacing: a burst of 400 exports is how the large-query
            # failures started. Slow is fine — the queue is asynchronous anyway.
            time.sleep(nap)

    conn2.close()
    print(f"fired {fired} export(s). They will arrive at the webhook and be "
          f"queued in hd_deliveries; run the drain job to ingest.")


if __name__ == "__main__":
    main()
