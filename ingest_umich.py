#!/usr/bin/env python3
"""
Cignal System - University of Michigan Surveys of Consumers ingestion.

Pulls the two public monthly tables published at www.sca.isr.umich.edu/tables.html:

  tbmiccice.csv  -> ICC (Index of Current Economic Conditions)
                    ICE (Index of Consumer Expectations)
  tbmics.csv     -> ICS_ALL (headline Index of Consumer Sentiment)

Three slugs, all national:
  umich_current_conditions   coincident   the "how things are now" leg
  umich_expectations         leading      the "where things are going" leg;
                                          an official component of the US LEI
  umich_sentiment_direct     leading      headline at the UMich vintage, NOT PRIMARY

WHY umich_sentiment_direct EXISTS
---------------------------------
The designated primary for Consumer Sentiment is slug `consumer_sentiment`
(FRED UMCSENT) and that does not change. But UMich asks FRED to republish the
headline on a one-month delay, while their own table is current. Rendering the
FRED headline next to same-day components would put a one-month gap inside a
single card and look broken even though both numbers are right. So the Anatomy
decomposition card reads all three legs from the UMich vintage, and nothing else
on the platform touches umich_sentiment_direct. It is is_public=false so it stays
out of the anon catalog and the ticker.

LICENSING
---------
Display is permitted under written consent from the Surveys of Consumers group
granted 2026-08-04. Two conditions attach, and both are load-bearing:

  1. Charts must be recreated by us. We never reproduce their PDF exhibits,
     chart images, or data booklet graphics. We render our own SVG from values.
  2. The citation string is exact and is not the FRED string:
       "University of Michigan, Survey Research Center, Surveys of Consumers"

The consent is revocable and explicitly "subject to change." It is not a
contract. If this pipeline is still running years from now, someone should
re-confirm rather than assume.

REVISION POLICY - DOCUMENTED EXCEPTION #2 (alongside HelloData)
---------------------------------------------------------------
Everywhere else in this warehouse, revision-0 first prints are permanent,
because for FRED/Census/BEA the first print is what the market actually knew at
the time, and the revision is itself an event worth studying.

UMich is not that kind of source *for us*. They republish the entire history
every month carrying seasonal-adjustment revisions, and they keep no public
vintage archive, so the "first print" we hold is not what anyone knew back
then - it is just whatever their table said the day we happened to backfill.
Worse, freezing it would drift our displayed numbers away from the numbers UMich
publishes, which is exactly the wrong failure mode for a series we display under
a citation requirement. A reader who checks our figure against sca.isr.umich.edu
must find the same number.

So: latest-wins, scoped to source = 'UMich Surveys of Consumers' only. The
mechanism mirrors drain_hellodata.py - insert-if-changed writes a new revision,
then a promote pass makes the newest value revision 0 and drops the superseded
row. Restatements are printed to the run log before they are dropped, so the
Actions history is the record of what UMich changed and when.

Env:  SUPABASE_DB_URL   (Session pooler URI)
Deps: pip install pandas psycopg2-binary requests
"""
import io
import os
import sys
import datetime as dt

import requests
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

BASE = "https://www.sca.isr.umich.edu/files/"
SOURCE = "UMich Surveys of Consumers"

# (filename, {csv_column: slug})
FILES = [
    ("tbmiccice.csv", {"ICC": "umich_current_conditions",
                       "ICE": "umich_expectations"}),
    ("tbmics.csv", {"ICS_ALL": "umich_sentiment_direct"}),
]

MONTHS = {"January": 1, "February": 2, "March": 3, "April": 4, "May": 5,
          "June": 6, "July": 7, "August": 8, "September": 9, "October": 10,
          "November": 11, "December": 12}

UA = {"User-Agent": "Mozilla/5.0 (compatible; CignalSystem/1.0)"}


def fetch(fname):
    """Download one UMich table and return it with a parsed obs_date column.

    Their files carry a Month name and a four-digit year in separate columns and
    are dated to the first of the month, matching how every other monthly series
    in this warehouse is keyed.
    """
    r = requests.get(BASE + fname, headers=UA, timeout=120)
    r.raise_for_status()
    d = pd.read_csv(io.StringIO(r.text))
    d.columns = [c.strip() for c in d.columns]
    month_num = d["Month"].astype(str).str.strip().map(MONTHS)
    if month_num.isna().any():
        bad = sorted(set(d.loc[month_num.isna(), "Month"].astype(str)))
        sys.exit(f"ERROR: unrecognised month label(s) in {fname}: {bad}")
    d["obs_date"] = pd.to_datetime(
        dict(year=d["YYYY"], month=month_num, day=1)).dt.date
    return d


def collect():
    """Return a long frame of (slug, obs_date, value) across both files.

    Pre-1978 the survey ran irregularly - roughly February/May/November - and ICE
    does not begin until November 1952. Those gaps are real, so they are loaded
    as-is rather than interpolated; the front end defaults its window to 1978,
    where the cadence becomes continuous and null-free.
    """
    frames = []
    for fname, colmap in FILES:
        d = fetch(fname)
        for col, slug in colmap.items():
            if col not in d.columns:
                sys.exit(f"ERROR: expected column {col!r} missing from {fname}. "
                         f"Saw: {list(d.columns)}")
            part = d[["obs_date", col]].dropna(subset=[col]).copy()
            part = part.rename(columns={col: "value"})
            part["slug"] = slug
            frames.append(part[["slug", "obs_date", "value"]])
            print(f"  {slug:<26} {len(part):>4} obs  "
                  f"{part.obs_date.min()} .. {part.obs_date.max()}")
    return pd.concat(frames, ignore_index=True)


def national_region_id(cur):
    cur.execute("SELECT id FROM regions WHERE region_type='national' AND code='US'")
    row = cur.fetchone()
    if not row:
        sys.exit("ERROR: national region (region_type='national', code='US') not found")
    return row[0]


def indicator_ids(cur, slugs):
    cur.execute("SELECT slug, id FROM indicators WHERE slug = ANY(%s)", (list(slugs),))
    found = dict(cur.fetchall())
    missing = set(slugs) - set(found)
    if missing:
        sys.exit(f"ERROR: indicator(s) not registered: {sorted(missing)}. "
                 f"Register them before running this ingest.")
    return found


def load_series(cur, ind_id, region_id, rows, release):
    """Insert-if-changed against the latest revision on file.

    Writes nothing when the value is unchanged, so a normal month only touches
    the one new observation even though we re-read the full history every run.
    """
    cur.execute("CREATE TEMP TABLE stage (obs_date date, value numeric) ON COMMIT DROP")
    execute_values(cur, "INSERT INTO stage (obs_date, value) VALUES %s",
                   [(r.obs_date, float(r.value)) for r in rows.itertuples(index=False)])
    cur.execute("""
        INSERT INTO observations (indicator_id, region_id, obs_date, value, revision, release_date)
        SELECT %(ind)s, %(reg)s, s.obs_date, s.value,
               COALESCE(latest.revision + 1, 0), %(release)s
          FROM stage s
          LEFT JOIN LATERAL (
                SELECT o.value, o.revision
                  FROM observations o
                 WHERE o.indicator_id = %(ind)s
                   AND o.region_id = %(reg)s
                   AND o.obs_date = s.obs_date
                 ORDER BY o.revision DESC
                 LIMIT 1
          ) latest ON true
         WHERE latest.value IS DISTINCT FROM s.value
    """, {"ind": ind_id, "reg": region_id, "release": release})
    return cur.rowcount


def report_and_promote(cur):
    """Log restatements, then make the newest value revision 0 (latest-wins).

    Scoped by source so this can never touch a first-print-wins series. The
    SELECT runs before the DELETE precisely so the old values reach the run log
    on their way out - UMich gives us no vintage archive, so the Actions history
    is the only place a restatement is ever recorded.
    """
    cur.execute("""
        SELECT i.slug, o.obs_date, o.value AS old_value, n.value AS new_value
          FROM observations o
          JOIN indicators i ON i.id = o.indicator_id
          JOIN LATERAL (
                SELECT o2.value FROM observations o2
                 WHERE o2.indicator_id = o.indicator_id
                   AND o2.region_id = o.region_id
                   AND o2.obs_date = o.obs_date
                   AND o2.revision > 0
                 ORDER BY o2.revision DESC LIMIT 1
          ) n ON true
         WHERE i.source = %s AND o.revision = 0
         ORDER BY i.slug, o.obs_date
    """, (SOURCE,))
    restated = cur.fetchall()
    if restated:
        print(f"\nUMich restated {len(restated)} historical value(s) since last run:")
        for slug, d, old, new in restated[:60]:
            print(f"  {slug:<26} {d}  {old} -> {new}")
        if len(restated) > 60:
            print(f"  ... and {len(restated) - 60} more")
    else:
        print("\nNo historical restatements this run.")

    cur.execute("""
        DELETE FROM observations o USING indicators i
         WHERE i.id = o.indicator_id AND i.source = %s AND o.revision = 0
           AND EXISTS (SELECT 1 FROM observations o2
                        WHERE o2.indicator_id = o.indicator_id
                          AND o2.region_id = o.region_id
                          AND o2.obs_date = o.obs_date
                          AND o2.revision > 0)
    """, (SOURCE,))
    dropped = cur.rowcount
    cur.execute("""
        UPDATE observations o SET revision = 0 FROM indicators i
         WHERE i.id = o.indicator_id AND i.source = %s AND o.revision > 0
    """, (SOURCE,))
    promoted = cur.rowcount
    if promoted:
        print(f"latest-wins: promoted {promoted} value(s), dropped {dropped} superseded")
    return promoted


def main():
    db = os.environ.get("SUPABASE_DB_URL")
    if not db:
        sys.exit("ERROR: SUPABASE_DB_URL not set")
    release = dt.date.today()
    print(f"UMich Surveys of Consumers ingestion - release_date {release}")

    long = collect()

    conn = psycopg2.connect(db)
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            region_id = national_region_id(cur)
            ids = indicator_ids(cur, long["slug"].unique())
            total = 0
            for slug, part in long.groupby("slug"):
                n = load_series(cur, ids[slug], region_id, part, release)
                total += n
                print(f"  {slug:<26} {n:>4} row(s) written")
            report_and_promote(cur)
        conn.commit()
        print(f"\nDone. Committed {total} write(s).")

        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("SET statement_timeout = 0")
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_indicator_analytics;")
        print("Refreshed mv_indicator_analytics.")
    except Exception:
        conn.rollback()
        print("\nRolled back - no partial writes.")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
