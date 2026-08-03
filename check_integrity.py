#!/usr/bin/env python3
"""
Cignal System - data-integrity invariant checks.

Runs after every drain. Exists because three bugs in the HelloData build shared
one shape: an assumption that was true when written, silently falsified later,
and only caught by a human happening to look.

  1. `metro_code_map` built {name: code} across BOTH metro families. True while
     only one family had HelloData. Once national firing began it would have
     written metro rows to a nondeterministic family, invisible to the site.
  2. `platform_stats.zip_count` counted every zip region, documented as "all
     carry data". The coverage load created 3.7k data-less zip regions and
     inflated the public figure 9,092 -> 12,770.
  3. Re-ingesting on a changed universe wrote revision 1 while the materialized
     view reads revision 0, so the site served a superseded basis.

None were caught by a build or a test - each was a *state* invariant, not a code
error, so the check has to run against the live warehouse. That is what this is.

Exit code 1 on any violation so the workflow surfaces it rather than passing.

Env: SUPABASE_DB_URL
"""
import os, sys
import psycopg2

CHECKS = [
    (
        "hellodata metro rows sit ONLY on the CBSA-coded family",
        """SELECT count(*) FROM observations o
             JOIN indicators i ON i.id = o.indicator_id
             JOIN regions r ON r.id = o.region_id
            WHERE i.source = 'HelloData' AND r.region_type = 'metro'
              AND r.code !~ '^[0-9]{5}$'""",
        0,
        "metro observations landed on name-coded regions; the site queries by "
        "CBSA and will not see them (see metro_code_map)",
    ),
    (
        "no HelloData observation above revision 0",
        """SELECT count(*) FROM observations o
             JOIN indicators i ON i.id = o.indicator_id
            WHERE i.source = 'HelloData' AND o.revision > 0""",
        0,
        "HelloData is latest-wins (see drain_hellodata.py) and the drain promotes "
        "restatements at the end of every batch. Rows left above revision 0 mean "
        "that promotion did not run, so mv_indicator_analytics - which reads "
        "revision 0 only - is serving a superseded value",
    ),
    (
        "every published ZIP clears the disclosure floor",
        """SELECT count(*) FROM hd_region_coverage
            WHERE publishable AND (properties < 3 OR max_share > 50)""",
        0,
        "a ZIP is marked publishable despite failing the 3-property / 50% "
        "dominance rule",
    ),
    (
        "no HelloData ZIP data for a region without a coverage row",
        """SELECT count(DISTINCT o.region_id) FROM observations o
             JOIN indicators i ON i.id = o.indicator_id
             JOIN regions r ON r.id = o.region_id
            WHERE i.source = 'HelloData' AND r.region_type = 'zip'
              AND NOT EXISTS (SELECT 1 FROM hd_region_coverage c
                               WHERE c.region_id = r.id)""",
        0,
        "ZIP pricing exists with no coverage row, so disclosure control cannot "
        "be evaluated for it",
    ),
    (
        "platform_stats answers within the anon statement timeout",
        """SELECT CASE WHEN (SELECT count(*) FROM (SELECT platform_stats()) t) = 1
                       THEN 0 ELSE 1 END""",
        0,
        "the home-page stats query is failing; visitors see blank MSA/ZIP/data "
        "point counters (see the 2026-08-01 index fix)",
    ),
    (
        "the backfill is still progressing (a delivery within 6h, or nothing left)",
        """SELECT CASE
                 WHEN NOT EXISTS (
                        SELECT 1 FROM regions r
                         WHERE r.region_type='metro' AND r.code ~ '^[0-9]{5}$'
                           AND EXISTS (SELECT 1 FROM hd_metro_size s WHERE s.region_id=r.id)
                           AND NOT EXISTS (
                                 SELECT 1 FROM observations o
                                   JOIN indicators i ON i.id=o.indicator_id
                                  WHERE i.source='HelloData' AND i.slug='hd_effective_rent'
                                    AND o.region_id=r.id))
                   THEN 0                       -- national backfill complete
                 WHEN (SELECT max(received_at) FROM hd_deliveries) > now() - interval '6 hours'
                   THEN 0                       -- still receiving
                 WHEN (SELECT max(fired_at) FROM hd_fired) > now() - interval '90 minutes'
                   THEN 0                       -- just fired; deliveries still in flight
                 ELSE 1 END""",
        0,
        "metros remain unfired but no delivery has arrived in 6h - the fire job "
        "is reporting success while doing nothing (this is exactly how the empty "
        "HD_FIRE_MODE bug hid for 33h: GitHub sets input-backed env vars to '' on "
        "scheduled runs, so a Python default never applies)",
    ),
    (
        "no metro is stuck with only empty exports",
        """SELECT count(*) FROM regions r
            WHERE r.region_type='metro' AND r.code ~ '^[0-9]{5}$'
              AND EXISTS (SELECT 1 FROM hd_metro_size s WHERE s.region_id=r.id)
              AND EXISTS (SELECT 1 FROM hd_deliveries d
                           WHERE d.name = 'cignal_zip_' || r.code AND d.status='empty'
                             AND d.received_at < now() - interval '6 hours')
              AND NOT EXISTS (SELECT 1 FROM observations o
                                JOIN indicators i ON i.id=o.indicator_id
                               WHERE i.source='HelloData' AND i.slug='hd_effective_rent'
                                 AND o.region_id=r.id)""",
        0,
        "a metro's exports keep returning empty files and it has no data - the "
        "MSA label sent to HelloData does not match theirs, so it will look like "
        "a permanent hole in national coverage",
    ),
    (
        "restricted indicators are invisible to the public wrapper view",
        """SELECT count(*) FROM v_indicator_analytics v
             JOIN indicators i ON i.slug = v.slug
            WHERE i.restricted""",
        0,
        "licensed data is reachable through the public view",
    ),
    (
        "platform_stats.zip_count matches zips that actually carry data",
        """SELECT abs(
             (platform_stats()->>'zip_count')::int
             - (SELECT count(*) FROM regions r WHERE r.region_type='zip'
                  AND EXISTS (SELECT 1 FROM observations o WHERE o.region_id=r.id)))""",
        0,
        "the public ZIP count has drifted from real coverage",
    ),
]


def main():
    db = os.environ.get("SUPABASE_DB_URL")
    if not db:
        sys.exit("ERROR: SUPABASE_DB_URL required")
    conn = psycopg2.connect(db)
    conn.autocommit = True
    bad = 0
    with conn.cursor() as cur:
        for name, sql, expected, why in CHECKS:
            cur.execute("SET statement_timeout = 120000")
            try:
                cur.execute(sql)
                got = cur.fetchone()[0]
            except Exception as e:
                print(f"  ?? {name}\n     check itself failed: {e}")
                bad += 1
                continue
            if got == expected:
                print(f"  ok {name}")
            else:
                bad += 1
                print(f"  FAIL {name}\n       got {got}, expected {expected}\n       {why}")
    conn.close()
    if bad:
        print(f"\n{bad} invariant(s) violated")
        sys.exit(1)
    print("\nall invariants hold")


if __name__ == "__main__":
    main()
