#!/usr/bin/env python3
"""
List and publish composed drafts.

Exists so nobody has to open a SQL editor. Driven entirely by workflow inputs:

  ACTION=list                     show every draft with its gate result
  ACTION=publish SLUG=<slug>      set a draft live
  ACTION=unpublish SLUG=<slug>    take it back down
  ACTION=reject SLUG=<slug>       mark it rejected so it stops appearing
  ACTION=regate                   re-evaluate stored drafts against the current
                                  gate. Gate results are written at compose
                                  time, so a draft held by a gate bug keeps its
                                  stale failure list until this is run. Costs no
                                  API calls.

Publishing only flips a status. The site reads status='published' through RLS,
so an article appears within about five minutes of the change and no deploy is
needed.
"""
import os
import sys
import datetime as dt
import importlib.util

import psycopg2
import psycopg2.extras

DB_URL = os.environ["SUPABASE_DB_URL"]
ACTION = os.environ.get("ACTION", "list").strip().lower()
SLUG = os.environ.get("SLUG", "").strip()
SITE = os.environ.get("SITE", "multifamily30x").strip()


def load_gate():
    """Import gate() and its fact shape from compose_news.py so there is exactly
    one definition of the rules."""
    spec = importlib.util.spec_from_file_location(
        "compose_news", os.path.join(os.path.dirname(os.path.abspath(__file__)), "compose_news.py"))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def regate(conn, cur):
    m = load_gate()
    cur.execute("select id, slug, headline, body, fact_ids, gate_pass from drafts where site = %s", (SITE,))
    rows = cur.fetchall()
    changed = 0
    for r in rows:
        if not r["fact_ids"]:
            continue
        cur.execute(
            """select f.id, f.fact_text, f.value_numeric, f.unit, f.period_start,
                      f.period_end, f.signal_role, f.novelty, f.is_estimate,
                      f.confidence, f.metric_slug
                 from news_facts f where f.id = any(%s)""",
            (r["fact_ids"],),
        )
        facts = [dict(x) for x in cur.fetchall()]
        for i, f in enumerate(facts, 1):
            f["ref"] = f"f{i}"
            f["corroboration"] = 1
        ok, failures, coverage = m.gate(r["body"] or {}, facts)
        if ok != r["gate_pass"]:
            changed += 1
            print(f"  {'HELD -> PASS' if ok else 'PASS -> HELD'}  {(r['headline'] or '')[:62]}")
        cur.execute(
            "update drafts set gate_pass = %s, gate_failures = %s, coverage = %s where id = %s",
            (ok, psycopg2.extras.Json(failures), round(coverage, 3), r["id"]),
        )
    conn.commit()
    print(f"\nre-gated {len(rows)} draft(s), {changed} changed verdict\n")


def rule(n=104):
    print("-" * n)


def listing(cur):
    cur.execute(
        """
        select slug, headline, status, gate_pass, coverage, corroboration,
               array_length(fact_ids, 1) as n_facts,
               gate_failures, created_at
          from drafts
         where site = %s
         order by created_at desc
         limit 60
        """,
        (SITE,),
    )
    rows = cur.fetchall()
    if not rows:
        print(f"No drafts yet for {SITE}.")
        return

    live = [r for r in rows if r["status"] == "published"]
    print(f"{len(rows)} draft(s) for {SITE} — {len(live)} currently published\n")
    rule()
    print(f"{'STATUS':<10} {'GATE':<6} {'FACTS':<6} {'COV':<5} HEADLINE")
    rule()
    for r in rows:
        cov = f"{float(r['coverage'] or 0)*100:.0f}%"
        gate = "PASS" if r["gate_pass"] else "HELD"
        print(f"{r['status']:<10} {gate:<6} {r['n_facts'] or 0:<6} {cov:<5} {(r['headline'] or '')[:70]}")
        print(f"{'':10} slug: {r['slug']}")
        if not r["gate_pass"]:
            for f in (r["gate_failures"] or [])[:3]:
                print(f"{'':10}   x {f}")
        print()


def set_status(cur, new_status):
    if not SLUG:
        print("SLUG is required for that action.")
        sys.exit(1)
    stamp = "published_at = now()," if new_status == "published" else ""
    cur.execute(
        f"update drafts set status = %s, {stamp} reviewed_at = now() "
        f"where site = %s and slug = %s returning headline, status",
        (new_status, SITE, SLUG),
    )
    row = cur.fetchone()
    if not row:
        print(f"No draft with slug '{SLUG}' for site '{SITE}'. Run ACTION=list to see valid slugs.")
        sys.exit(1)
    print(f"{row['status'].upper()}: {row['headline']}")
    if new_status == "published":
        print("\nLive on the site within ~5 minutes. No deploy needed.")


def main():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if ACTION == "list":
                listing(cur)
            elif ACTION == "regate":
                regate(conn, cur)
                listing(cur)
            elif ACTION in ("publish", "unpublish", "reject"):
                set_status(cur, {"publish": "published",
                                 "unpublish": "draft",
                                 "reject": "rejected"}[ACTION])
                conn.commit()
                print()
                listing(cur)
            else:
                print(f"Unknown ACTION '{ACTION}'. Use list, regate, publish, unpublish or reject.")
                sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
