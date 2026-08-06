#!/usr/bin/env python3
"""
Register the labor-slack indicators: participation and underemployment.

One-off, idempotent — re-running inserts nothing new and does not overwrite an
existing row. Registration lives in the database, not in code, so this script is
the whole mechanism; ingest_fred.py picks up anything with source = 'FRED' on
its next run and backfills full history automatically.

Four rows:

  labor_participation        CIVPART       headline LFPR, 16+, monthly SA
  labor_participation_prime  LNS11300060   prime-age 25-54 LFPR, monthly SA
  u6_rate                    U6RATE        U-6 underemployment, monthly SA
  u6_gap                     (derived)     u6_rate - unemployment

All four originate in the BLS Current Population Survey and publish together in
the monthly Employment Situation release (LFPR in table A-1, U-6 in table A-15).
BLS output is public domain — no license, no redistribution restriction, unlike
the Conference Board series sitting sealed in this same warehouse.

Why headline AND prime-age: CIVPART drifts down structurally as boomers retire,
so it reads demographics as much as cycle. The 25-54 cut removes both the
retirement and the enrollment edges and is the one that actually tracks the
cycle — and the one that maps to household formation.

Why the gap is the point: U-6 counts involuntary part-time and marginally
attached workers alongside the officially unemployed. Employers cut hours before
they cut headcount, so U-6 widens against a still-flat U-3 before layoffs show up
anywhere. The spread leads where its legs do not. It is computed by
ingest_fred.py's DERIVED mechanism, first prints only, one revision per change.

Env:  SUPABASE_DB_URL (Session pooler URI)
Deps: pip install psycopg2-binary
"""
import os
import sys
import psycopg2
import psycopg2.extras

DB_URL = os.environ["SUPABASE_DB_URL"]

# Every FRED national indicator in the catalog carries this same vertical set;
# match it rather than inventing a narrower one, or the row goes missing from
# sibling verticals for no stated reason.
VERTICALS = [
    "multifamily", "general-real-estate", "real-estate-development",
    "small-business", "personal-finance", "single-family",
]

# slug, name, source, source_series, units, classification, higher_is_better, description
ROWS = [
    (
        "labor_participation",
        "Labor Force Participation Rate",
        "FRED", "CIVPART", "%", "coincident", True,
        "Share of the civilian population 16+ that is working or actively looking (BLS CPS, "
        "seasonally adjusted). Drifts down structurally as the population ages, so read the "
        "level against its own trend rather than against a fixed band.",
    ),
    (
        "labor_participation_prime",
        "Prime-Age Participation (25-54)",
        "FRED", "LNS11300060", "%", "coincident", True,
        "Labor force participation for ages 25-54 (BLS CPS, seasonally adjusted). Strips out "
        "retirement and school enrollment, which is what makes this the cycle-sensitive cut of "
        "participation — and the one that tracks household formation.",
    ),
    (
        "u6_rate",
        "Underemployment Rate (U-6)",
        "FRED", "U6RATE", "%", "coincident", False,
        "The broadest BLS measure of labor underutilization: the unemployed, plus everyone "
        "working part time because they cannot find full-time work, plus the marginally "
        "attached — as a share of the labor force plus the marginally attached. Monthly, "
        "seasonally adjusted, back to 1994.",
    ),
    (
        "u6_gap",
        "Underemployment Gap (U-6 - U-3)",
        "FRED (derived)", None, "percentage points", "leading", False,
        "U-6 minus the headline unemployment rate — the share of the workforce that is "
        "underemployed rather than unemployed. Employers cut hours before they cut headcount, "
        "so this widens while U-3 is still flat. DERIVED from u6_rate and unemployment, not a "
        "published series.",
    ),
]

# CPS publishes on the first Friday for the prior month — roughly a 5-8 day lag.
# Match the existing unemployment row rather than picking a new number.
RELEASE_LAG_DAYS = 8


def main():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("select slug from indicators where slug = any(%s)",
                        ([r[0] for r in ROWS],))
            have = {r["slug"] for r in cur.fetchall()}
            if have:
                print("already registered, leaving untouched:", sorted(have))

            added = 0
            for slug, name, source, sid, units, cls, hib, desc in ROWS:
                if slug in have:
                    continue
                cur.execute("""
                    insert into indicators
                      (slug, name, description, source, source_series, frequency, units,
                       classification, higher_is_better, is_public, display_order,
                       verticals, restricted, release_lag_days)
                    values (%s, %s, %s, %s, %s, 'monthly', %s, %s, %s, true, 0, %s, false, %s)
                """, (slug, name, desc, source, sid, units, cls, hib, VERTICALS, RELEASE_LAG_DAYS))
                print(f"  + {slug:<26} {source:<15} {sid or '(derived)'}")
                added += 1

            cur.execute("select count(*) c from indicators")
            total = cur.fetchone()["c"]

        conn.commit()
        print(f"Done. {added} added; {total} indicators in catalog.")
        if added:
            print("Next: run ingest_fred.py — it picks these up by source and backfills history.")
    except Exception:
        conn.rollback()
        print("Rolled back — no partial writes.")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
