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


def seg_for(name):
    """Segment is the trailing token: cignal_zip_45220_mkt or the chunked
    cignal_zip_35620_c1_mkt both -> 'mkt'. Un-suffixed (all-in) -> None."""
    parts = (name or "").lower().split("_")
    return parts[-1] if parts and parts[-1] in ("mkt", "aff", "stu", "sen") else None


def main():
    db = os.environ.get("SUPABASE_DB_URL")
    if not db:
        sys.exit("ERROR: SUPABASE_DB_URL required")
    limit = int(os.environ.get("HD_DRAIN_LIMIT") or "50")
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
            ing.run_one(conn, mode, url, refresh=False, segment=seg_for(name))
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

    # ---- Disclosure control: purge ZIP pricing with no coverage row ---------
    # A chunked metro export can return a ZIP that was not in the last national
    # coverage pull (new stock since). With no coverage row the 3-property /
    # 50%-dominance rule cannot be evaluated, so the data must not be retained -
    # hd_analytics already refuses to serve it, and keeping it only trips the
    # integrity check on every subsequent run. Small and self-correcting: the
    # next coverage refresh will bring the ZIP back legitimately.
    with conn.cursor() as cur:
        cur.execute("""
            DELETE FROM observations o USING indicators i, regions r
             WHERE i.id = o.indicator_id AND r.id = o.region_id
               AND i.source = 'HelloData' AND r.region_type = 'zip'
               AND NOT EXISTS (SELECT 1 FROM hd_region_coverage c
                                WHERE c.region_id = r.id)""")
        if cur.rowcount:
            print(f"disclosure: purged {cur.rowcount} row(s) for ZIPs with no coverage row")

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
        # Derive metro-level rollups from ZIP data for any metro missing a native
        # rollup (giants that cap out the metro export, plus small metros) so the
        # metro grain is complete. Units-weighted, gap-filling (never overwrites a
        # native metro value). Runs before the refresh so derived rows land in the mv.
        print("deriving metro rollups from ZIP data …")
        with conn.cursor() as cur:
            cur.execute("SET statement_timeout = 0")
            cur.execute("SELECT public.hd_derive_metro_rollups();")
            derived = cur.fetchone()[0]
        print(f"derived {derived} metro-rollup rows.")
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
