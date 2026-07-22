#!/usr/bin/env python3
"""
Add operations-focused feeds to news_sources.

One-off, idempotent: re-running inserts nothing new. Feeds live in the database,
not in code, so this is the whole mechanism for widening coverage.

Every URL below was probed live and scored on how many of its recent headlines
match operator vocabulary (leasing, turns, maintenance, staffing, payroll,
retention, occupancy, expenses, utilities, NOI). The existing mix skewed heavily
to transactions and groundbreakings, which is why composed drafts kept coming
out as development announcements.
"""
import os
import psycopg2
import psycopg2.extras

DB_URL = os.environ["SUPABASE_DB_URL"]

# name, feed_url, why
CANDIDATES = [
    ("Zego", "https://www.gozego.com/feed/",
     "8/10 headlines operational — utility billing, resident payments, fraud/NOI"),
    ("Multifamily Executive", "https://www.multifamilyexecutive.com/rss.xml",
     "7/10 — maintenance playbook, NOI erosion, resident experience, margin"),
    ("RealPage Analytics", "https://www.realpage.com/analytics/feed/",
     "market-level rent/supply/occupancy data; feeds tracked indicators"),
    ("Grace Hill", "https://gracehill.com/feed/",
     "staffing, training, fair-housing compliance, employee turnover"),
    ("Multi-Housing News", "https://www.multihousingnews.com/feed/",
     "general trade volume"),
]


def main():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Match the existing convention rather than inventing values.
            cur.execute("select tier, count(*) n from news_sources "
                        "where tier is not null group by tier order by n desc")
            tiers = cur.fetchall()
            print("existing tiers:", [(t["tier"], t["n"]) for t in tiers] or "none")
            default_tier = tiers[0]["tier"] if tiers else None

            cur.execute("select count(*) c from news_sources where is_active")
            print("active sources before:", cur.fetchone()["c"])

            cur.execute("select feed_url from news_sources")
            have = {r["feed_url"] for r in cur.fetchall()}

        added = 0
        with conn.cursor() as cur:
            for name, url, why in CANDIDATES:
                if url in have:
                    print(f"  exists   {name}")
                    continue
                cur.execute(
                    "insert into news_sources (name, feed_url, tier, vertical, is_active) "
                    "values (%s,%s,%s,'multifamily',true)",
                    (name, url, default_tier),
                )
                added += 1
                print(f"  ADDED    {name}  — {why}")
        conn.commit()

        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("select count(*) c from news_sources where is_active")
            print(f"active sources after: {cur.fetchone()['c']}  (added {added})")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
