#!/usr/bin/env python3
"""
Cignal System - HelloData delivery drain.

The webhook records every verified export delivery in hd_deliveries. This job
drains that queue: for each pending row it infers the mode from the export name,
downloads the signed CSV, and hands it to the ingest_hellodata logic.

Why a queue at all: a national pull is ~400 exports (HelloData silently fails on
large pricing queries - a single state's ZIP history never returns, while one MSA
does), arriving asynchronously over hours. Signed URLs live 30 days, so nothing
is lost if the drain runs later.

Naming convention drives routing - the export `name` must start with:
    cignal_zip_*       -> zip pricing history
    cignal_metro_*     -> metro pricing history
    cignal_coverage_*  -> ZIP coverage / disclosure control
Anything else is marked 'skipped' rather than guessed at.

Env: SUPABASE_DB_URL, [HD_DRAIN_LIMIT=50], [HD_REFRESH=1]
"""
import os, sys, io, datetime as dt
import psycopg2
import ingest_hellodata as ing

MAX_ATTEMPTS = 3


def mode_for(name):
    n = (name or "").lower()
    if n.startswith("cignal_zip"):
        return "zip"
    if n.startswith("cignal_metro"):
        return "metro"
    if n.startswith("cignal_coverage"):
        return "coverage"
    return None


def main():
    db = os.environ.get("SUPABASE_DB_URL")
    if not db:
        sys.exit("ERROR: SUPABASE_DB_URL required")
    limit = int(os.environ.get("HD_DRAIN_LIMIT", "50"))
    do_refresh = os.environ.get("HD_REFRESH", "1") != "0"

    conn = psycopg2.connect(db)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute(
            """SELECT id, query_uuid, name, url, expires, attempts
                 FROM hd_deliveries
                WHERE status = 'pending' AND attempts < %s
                  AND (expires IS NULL OR expires > now())
             ORDER BY received_at
                LIMIT %s""",
            (MAX_ATTEMPTS, limit),
        )
        jobs = cur.fetchall()

        # Expired-before-processing is a real outcome worth recording, not a retry.
        cur.execute(
            """UPDATE hd_deliveries SET status='expired', processed_at=now(),
                      note='signed URL expired before drain'
                WHERE status='pending' AND expires IS NOT NULL AND expires <= now()"""
        )
        if cur.rowcount:
            print(f"marked {cur.rowcount} expired")

    print(f"draining {len(jobs)} delivery(ies)")
    ok = fail = skip = 0

    for jid, uuid, name, url, expires, attempts in jobs:
        mode = mode_for(name)
        if mode is None:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE hd_deliveries SET status='skipped', processed_at=now(), "
                    "note=%s WHERE id=%s",
                    (f"no mode for name '{name}'", jid),
                )
            skip += 1
            print(f"  SKIP {name} (unrecognised name)")
            continue

        with conn.cursor() as cur:
            cur.execute("UPDATE hd_deliveries SET attempts=attempts+1 WHERE id=%s", (jid,))

        try:
            print(f"  [{mode}] {name}")
            ing.run_one(conn, mode, url, refresh=False)
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE hd_deliveries SET status='done', processed_at=now(), note=NULL "
                    "WHERE id=%s",
                    (jid,),
                )
            ok += 1
        except Exception as e:  # keep draining; one bad file must not stall the queue
            msg = str(e)[:500]
            # An export whose market filter matched nothing returns a 0-byte CSV.
            # That is a permanent outcome, not a transient failure - retrying it
            # three times wastes runs and buries real errors. Usual cause: the
            # MSA label sent to HelloData did not match theirs exactly (regions
            # holds "Dayton  OH" where HelloData has "Dayton, OH"), so the export
            # succeeds and returns nothing.
            if "No columns to parse" in msg or "EmptyData" in type(e).__name__:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE hd_deliveries SET status='empty', processed_at=now(), "
                        "note='export returned an empty file - check the MSA label' "
                        "WHERE id=%s", (jid,))
                skip += 1
                print("    EMPTY (no rows matched the filter) - not retrying")
                continue
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE hd_deliveries SET status=CASE WHEN attempts>=%s THEN 'failed' "
                    "ELSE 'pending' END, note=%s WHERE id=%s",
                    (MAX_ATTEMPTS, msg, jid),
                )
            fail += 1
            print(f"    ERROR: {msg}")

    # ---- HelloData is latest-wins (deliberate exception) --------------------
    # Everywhere else in this warehouse revision-0 first prints are permanent,
    # because for FRED/Census/BEA the first print is what the market actually
    # knew at the time - the revision is itself an event worth studying.
    #
    # HelloData is not that kind of source. It is a continuously re-scraped
    # listings aggregate with no publication calendar, so the "first print" for a
    # backfilled 2023 month is not what anyone knew in 2023 - it is just whichever
    # export happened to run first. Preserving it canonises an artifact of our
    # ingestion order.
    #
    # Observed: ZIP 48167 first printed flat at $1,799 for five consecutive
    # months (a cell built on very few listings); the later export moved
    # $1,655 -> $1,648 -> $1,623 -> $1,569, which is what a real rent series does.
    #
    # Decision (Benjamin, 2026-08-01): treat the newest HelloData value as true.
    # Scope is HelloData ONLY - every other source keeps first-print-wins.
    with conn.cursor() as cur:
        cur.execute("""
            DELETE FROM observations o USING indicators i
             WHERE i.id = o.indicator_id AND i.source = 'HelloData' AND o.revision = 0
               AND EXISTS (SELECT 1 FROM observations o2
                            WHERE o2.indicator_id = o.indicator_id
                              AND o2.region_id = o.region_id
                              AND o2.obs_date = o.obs_date
                              AND o2.revision > 0)""")
        superseded = cur.rowcount
        cur.execute("""
            UPDATE observations o SET revision = 0 FROM indicators i
             WHERE i.id = o.indicator_id AND i.source = 'HelloData' AND o.revision > 0""")
        promoted = cur.rowcount
    if promoted:
        print(f"latest-wins: promoted {promoted:,} restated value(s), "
              f"dropped {superseded:,} superseded")

    # One refresh for the whole batch. Refreshing per-file would serialise ~400
    # concurrent refreshes of a half-million-row view and take all night.
    if ok and do_refresh:
        print("refreshing mv_indicator_analytics …")
        with conn.cursor() as cur:
            cur.execute("SET statement_timeout = 0")
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_indicator_analytics;")
        print("refreshed.")

    with conn.cursor() as cur:
        cur.execute("SELECT status, count(*) FROM hd_deliveries GROUP BY 1 ORDER BY 1")
        print("queue:", ", ".join(f"{s}={c}" for s, c in cur.fetchall()))

    conn.close()
    print(f"done: {ok} ingested, {fail} failed, {skip} skipped")


if __name__ == "__main__":
    main()
