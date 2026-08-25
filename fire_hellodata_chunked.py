#!/usr/bin/env python3
"""
Cignal System - chunked firing for oversized metros.

HelloData silently drops pricing exports above roughly 500-780k tracked units:
the request returns 201 with a queryUUID and no file ever arrives. Measured
2026-08-04, 96 minutes after firing with verified labels:

    Chicago      512,645 units  -> delivered
    Houston      779,530 units  -> nothing
    Dallas       985,684 units  -> nothing
    New York   2,811,102 units  -> nothing

Date-range splitting is impossible - `as_of_month` is groupable but rejects every
filter form ("Invalid filters ... As Of Month"), including from/to, equals and
greaterThanOrEqualTo.

ZIP-list chunking does work: `zip_code` is a Market Column, so a
`{"in": [...]}` filter satisfies HelloData's requirement that pricing queries be
filtered by market, while bounding the export to a size it will actually compute.
Verified with three downtown Dallas ZIPs - 117 rows returned in ~3 minutes.

So: get each oversized metro's ZIP list from a COVERAGE export (no pricing
columns, therefore not subject to the ceiling), then fire pricing in ZIP chunks.

Chunk names must still route through drain_hellodata.py, hence `cignal_zip_*`.
The metro-grain series for these markets is fired separately and unchunked - one
row per month is tiny regardless of metro size.

Env: HELLODATA_API_KEY, SUPABASE_DB_URL, [HD_CHUNK=60] [HD_SLEEP=4]
"""
import os, sys, json, time
import requests, psycopg2

API = "https://api.hellodata.ai/dataset/export"
WEBHOOK = os.environ.get(
    "WEBHOOK_URL", "https://multifamily.cignalsystem.com/api/hellodata/webhook"
)
MF = {"column": "number_units", "filter": {"greaterThanOrEqualTo": 50}}
AFF = {"column": "is_affordable", "filter": {"equals": False}}
AVGS = [
    {"column": "asking_rent", "aggregate": "Avg"},
    {"column": "effective_rent", "aggregate": "Avg"},
    {"column": "concession", "aggregate": "Avg"},
    {"column": "leased_percentage", "aggregate": "Avg"},
    {"column": "days_on_market", "aggregate": "Avg"},
]
def _eq(c, v): return {"column": c, "filter": {"equals": v}}
# One or more segments, comma-separated. "" = all-in.
SEGS = [x.strip() for x in (os.environ.get("HD_CHUNK_SEGMENT") or "").split(",") if x.strip()] or [""]
SEG_FILTERS = {
    "mkt": [MF, _eq("is_affordable", False), _eq("is_student", False), _eq("is_senior", False)],
    "aff": [MF, _eq("is_affordable", True)],
    "stu": [MF, _eq("is_student", True)],
    "sen": [MF, _eq("is_senior", True)],
}
CHUNK = int(os.environ.get("HD_CHUNK") or "60")
NAP = float(os.environ.get("HD_SLEEP") or "4")
BACKOFF = int(os.environ.get("HD_BACKOFF") or "90")


def fire(key, name, scopes, filters, limit=500000):
    body = {
        "dataset": {"scopes": scopes, "filters": filters, "limit": limit},
        "webhookURL": WEBHOOK,
        "name": name,
        "format": "csv",
    }
    r = requests.post(
        API,
        headers={"x-api-key": key, "Content-Type": "application/json"},
        data=json.dumps(body),
        timeout=90,
    )
    try:
        return r.status_code, r.json()
    except Exception:
        return r.status_code, {"raw": r.text[:200]}


def fire_with_backoff(key, name, scopes, filters):
    st, j = fire(key, name, scopes, filters)
    tries = 0
    # HelloData caps concurrent exports at 10 and answers 429 past that.
    while st == 429 and tries < 10:
        tries += 1
        print(f"    429 - waiting {BACKOFF}s (retry {tries})")
        time.sleep(BACKOFF)
        st, j = fire(key, name, scopes, filters)
    return st, j


def main():
    key = os.environ.get("HELLODATA_API_KEY")
    db = os.environ.get("SUPABASE_DB_URL")
    if not (key and db):
        sys.exit("ERROR: need HELLODATA_API_KEY and SUPABASE_DB_URL")

    metros_env = [x.strip() for x in (os.environ.get("HD_CHUNK_METROS") or "").split(",") if x.strip()]
    conn = psycopg2.connect(db)
    conn.autocommit = True
    with conn.cursor() as cur:
        if metros_env:
            # Explicit targets: fill ZIP-level gaps for oversized metros whose
            # metro-level series exists but whose ZIP chunks partially dropped.
            cur.execute(
                """SELECT r.code, s.msa_label, s.units
                     FROM regions r JOIN hd_metro_size s ON s.region_id = r.id
                    WHERE s.msa_label IS NOT NULL AND r.retired_at IS NULL
                      AND r.code = ANY(%s)
                    ORDER BY s.units DESC""",
                (metros_env,),
            )
        else:
            cur.execute(
                """
                SELECT r.code, s.msa_label, s.units
                  FROM regions r
                  JOIN hd_metro_size s ON s.region_id = r.id
                 WHERE s.msa_label IS NOT NULL
                   AND r.retired_at IS NULL
                   AND NOT EXISTS (SELECT 1 FROM observations o
                                     JOIN indicators i ON i.id = o.indicator_id
                                    WHERE i.source = 'HelloData'
                                      AND i.slug = %s
                                      AND o.region_id = r.id)
                 ORDER BY s.units DESC
                """, (("hd_effective_rent" + (f"_{SEGS[0]}" if SEGS[0] else "")),)
            )
        metros = cur.fetchall()

    if not metros:
        print("nothing missing - every labelled metro has pricing")
        return

    zl = json.load(open("ziplists.json"))  # {code: [zip, ...]}
    total = 0
    for SEG in SEGS:
      SEG_F = SEG_FILTERS[SEG] if SEG else [MF, AFF]
      SUF = f"_{SEG}" if SEG else ""
      print(f"=== segment: {SEG or 'all-in'} ===")
      for code, label, units in metros:
        zips = zl.get(code)
        if not zips:
            print(f"  {code} {label[:40]:42} NO ZIP LIST - skipped")
            continue
        chunks = [zips[i : i + CHUNK] for i in range(0, len(zips), CHUNK)]
        print(f"  {code} {label[:40]:42} {len(zips):>4} zips -> {len(chunks)} chunk(s)")

        for n, ch in enumerate(chunks, 1):
            name = f"cignal_zip_{code}_c{n}{SUF}"
            scopes = [{"column": "zip_code"}, {"column": "as_of_month"}] + AVGS
            filters = [{"column": "zip_code", "filter": {"in": ch}}] + SEG_F
            st, j = fire_with_backoff(key, name, scopes, filters)
            print(f"    {name:26} {st} {j.get('queryUUID') or j}")
            if j.get("queryUUID"):
                total += 1
            time.sleep(NAP)

        # Metro-grain series: one row per month, tiny, no chunking needed.
        st, j = fire_with_backoff(
            key,
            f"cignal_metro_{code}{SUF}",
            [{"column": "msa"}, {"column": "as_of_month"}] + AVGS,
            [{"column": "msa", "filter": {"equals": label}}] + SEG_F,
        )
        print(f"    cignal_metro_{code:<20} {st} {j.get('queryUUID') or j}")
        if j.get("queryUUID"):
            total += 1
        time.sleep(NAP)

    conn.close()
    print(f"\nfired {total} export(s); run the drain to ingest")


if __name__ == "__main__":
    main()
