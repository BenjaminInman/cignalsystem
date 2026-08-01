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
        "a re-ingest wrote revisions; mv_indicator_analytics reads revision 0 "
        "only, so the site is serving the OLD basis. Run the basis-migration "
        "SQL in docs/HELLODATA_STATE.md",
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
