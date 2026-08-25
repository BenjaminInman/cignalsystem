#!/usr/bin/env python3
"""Fire national per-segment COVERAGE exports (property counts + units per ZIP).

Coverage has no pricing columns, so it is exempt from HelloData's market-filter
requirement and its ~500-780k unit size ceiling - the whole country returns in
one export per segment. Feeds hd_segment_coverage, which gates per-segment
publishing (>=3 properties, no single property >50% of units).

Env: HELLODATA_API_KEY, [HD_COV_SEGMENTS=mkt,aff,stu,sen]
"""
import os, sys, json, time, requests

API = "https://api.hellodata.ai/dataset/export"
WEBHOOK = os.environ.get("WEBHOOK_URL", "https://multifamily.cignalsystem.com/api/hellodata/webhook")
MF = {"column": "number_units", "filter": {"greaterThanOrEqualTo": 50}}
def _eq(c, v): return {"column": c, "filter": {"equals": v}}
SEG_FILTERS = {
    "mkt": [MF, _eq("is_affordable", False), _eq("is_student", False), _eq("is_senior", False)],
    "aff": [MF, _eq("is_affordable", True)],
    "stu": [MF, _eq("is_student", True)],
    "sen": [MF, _eq("is_senior", True)],
}
COVERAGE_SCOPES = [
    {"column": "zip_code"},
    {"column": "property_id", "aggregate": "CountDistinct"},
    {"column": "number_units", "aggregate": "Sum"},
    {"column": "number_units", "aggregate": "Max"},
]

def fire(key, name, filters):
    body = {"dataset": {"scopes": COVERAGE_SCOPES, "filters": filters, "limit": 500000},
            "webhookURL": WEBHOOK, "name": name, "format": "csv"}
    r = requests.post(API, headers={"x-api-key": key, "Content-Type": "application/json"},
                      data=json.dumps(body), timeout=90)
    try: return r.status_code, r.json()
    except Exception: return r.status_code, {"raw": r.text[:200]}

def main():
    key = os.environ.get("HELLODATA_API_KEY")
    if not key: sys.exit("ERROR: need HELLODATA_API_KEY")
    segs = [s.strip() for s in (os.environ.get("HD_COV_SEGMENTS") or "mkt,aff,stu,sen").split(",") if s.strip()]
    for seg in segs:
        name = f"cignal_coverage_{seg}"
        st, j = fire(key, name, SEG_FILTERS[seg])
        tries = 0
        while st == 429 and tries < 8:
            tries += 1; print(f"  429 - waiting 90s (retry {tries})"); time.sleep(90)
            st, j = fire(key, name, SEG_FILTERS[seg])
        print(f"  {name:22} {st} {j.get('queryUUID') or j}")
        time.sleep(4)

if __name__ == "__main__":
    main()
