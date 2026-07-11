#!/usr/bin/env python3
"""
Ingest Fannie Mae and Freddie Mac multifamily signals from public monthly filings.

Four indicators, kept strictly separate (never blended):
  fnma_mf_delinquency  Fannie multifamily serious delinquency rate (%), monthly
  fmcc_mf_delinquency  Freddie multifamily delinquency rate (%), monthly
  fnma_mf_volume       Fannie new multifamily business volume ($B), quarterly
  fmcc_mf_volume       Freddie new multifamily business volume ($B), quarterly

These replace the OTC stock quotes for FNMA/FMCC on /indices. They are public,
free, redistribution-clean government/GSE data, and far more on-thesis for a
multifamily platform than a conservatorship-driven penny-stock tick.

Sources (public, no auth):
  Fannie Monthly Summary   https://www.fanniemae.com/media/document/pdf/{MMDDYY}.pdf
                           Table 7 "Serious Delinquency Rates" -- multifamily is
                           the last percent column; reconstructed from word
                           coordinates because the PDF interleaves table text.
  Freddie Monthly Volume   https://www.freddiemac.com/investors/financials/pdf/{MMYY}mvs.pdf
    Summary (MVS)          Narrative states the MF delinquency rate in prose.

Design notes:
  * VALIDATION GUARD: every parsed value is range-checked before any write. A
    layout change that yields a garbage number is dropped and logged, never
    written. GSE MF delinquency has sat in 0.00-1.00% for two decades; a value
    outside a generous sanity band is treated as a parse failure, not data.
  * Idempotent insert-if-changed against observations(indicator_id, region_id,
    obs_date, revision), same contract as every other pipeline.
  * region_id resolves to the existing 'national' region.
  * Refreshes mv_indicator_analytics CONCURRENTLY with statement_timeout=0.
"""

import os
import re
import sys
import json
import io
import datetime as dt
import urllib.request

import psycopg2
import pdfplumber

DB_URL = os.environ["SUPABASE_DB_URL"]
UA = {"User-Agent": "CignalSystem/1.0 (info@cignalsystem.com)"}

# Validation bands. Anything outside => treated as a parse failure.
DQ_MIN, DQ_MAX = 0.0, 5.0        # MF delinquency %, historic peak ~0.63 recent, ~2% GFC
VOL_MIN, VOL_MAX = 0.0, 60.0     # quarterly new MF business volume, $B


def fetch(url, timeout=60):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read()


def get_with_retry(url, attempts=4):
    import time
    delay = 4
    last = None
    for i in range(attempts):
        try:
            return fetch(url)
        except Exception as e:  # noqa: BLE001
            last = e
            if i < attempts - 1:
                time.sleep(delay)
                delay = min(delay * 2, 30)
    raise RuntimeError(f"{url} failed after {attempts} attempts: {last}")


# ---------------------------------------------------------------- Fannie Mae

def fannie_url(d):
    return f"https://www.fanniemae.com/media/document/pdf/{d:%m%d%y}.pdf"


def parse_fannie(pdf_bytes):
    """Return (mf_delinquency_pct, latest_month_date). Table 7's multifamily
    column is the last percent column; rows are 'Month YYYY  a% b% c% d% mf%'."""
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        # Table 7 lives on the interest-rate/delinquency page; scan all pages.
        rows = {}
        target_page = None
        for page in pdf.pages:
            t = page.extract_text() or ""
            if "Serious Delinquency Rates" in t:
                target_page = page
                break
        if target_page is None:
            return None, None
        words = target_page.extract_words()
        for w in words:
            y = round(w["top"])
            rows.setdefault(y, []).append((w["x0"], w["text"]))

    month_re = re.compile(
        r"^(January|February|March|April|May|June|July|August|"
        r"September|October|November|December)\s+(\d{4})$"
    )
    best = None  # (date, mf_pct)
    for y in sorted(rows):
        toks = [t for _, t in sorted(rows[y])]
        line = " ".join(toks)
        # data row starts "Month YYYY" then five percentages
        m = re.match(
            r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\s+"
            r"((?:\d+\.\d+%\s+){4}\d+\.\d+%)",
            line,
        )
        if not m:
            continue
        month, year = m.group(1), int(m.group(2))
        pcts = re.findall(r"(\d+\.\d+)%", m.group(3))
        if len(pcts) < 5:
            continue
        mf = float(pcts[-1])  # multifamily is the last percent column
        mon = dt.datetime.strptime(month, "%B").month
        d = dt.date(year, mon, 1)
        if best is None or d > best[0]:
            best = (d, mf)
    if best is None:
        return None, None
    return best[1], best[0]


# ---------------------------------------------------------------- Freddie Mac

def freddie_url(d):
    return f"https://www.freddiemac.com/investors/financials/pdf/{d:%m%y}mvs.pdf"


def parse_freddie(pdf_bytes):
    """Return (mf_delinquency_pct, month_date). The MVS states it in prose:
    'Our multifamily delinquency rate increased from 0.43% ... to 0.47% in May.'"""
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        txt = "\n".join((p.extract_text() or "") for p in pdf.pages[:2])
    flat = re.sub(r"\s+", " ", txt)
    # Older MVS PDFs interleave Table 1 numbers into the narrative sentence, so a
    # plain "...to X%" anchor breaks. Anchor on the from/to structure and tolerate
    # bounded table junk between the pieces; fall back to remained-flat / was.
    monname = None
    m = re.search(
        r"multifamily delinquency rate\b.{0,140}?from\s*(\d\.\d\d)\s*%.{0,60}?"
        r"to\s*(\d\.\d\d)\s*%\s*(?:in\s+)?([A-Z][a-z]+)",
        flat, re.I,
    )
    if m:
        pct, monname = float(m.group(2)), m.group(3)
    else:
        m = re.search(
            r"multifamily delinquency rate\b.{0,140}?(?:remained (?:flat|unchanged)|was)\s*"
            r"(?:at\s*)?(\d\.\d\d)\s*%\s*(?:in\s+)?([A-Z][a-z]+)",
            flat, re.I,
        )
        if not m:
            return None, None
        pct, monname = float(m.group(1)), m.group(2)
    # Year comes from the filing's own period line; month from the prose.
    ym = re.search(r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})", flat)
    year = int(ym.group(2)) if ym else dt.date.today().year
    try:
        mon = dt.datetime.strptime(monname, "%B").month
    except ValueError:
        return None, None
    return pct, dt.date(year, mon, 1)


# ---------------------------------------------------------------- DB plumbing

INDICATORS = {
    "fnma_mf_delinquency": dict(
        name="Fannie Mae Multifamily Serious Delinquency Rate",
        frequency="monthly", units="percent", source="Fannie Mae Monthly Summary",
        classification="lagging",
    ),
    "fmcc_mf_delinquency": dict(
        name="Freddie Mac Multifamily Delinquency Rate",
        frequency="monthly", units="percent", source="Freddie Mac Monthly Volume Summary",
        classification="lagging",
    ),
    "fnma_mf_volume": dict(
        name="Fannie Mae New Multifamily Business Volume",
        frequency="quarterly", units="usd_billions", source="Fannie Mae Financial Supplement",
        classification="coincident",
    ),
    "fmcc_mf_volume": dict(
        name="Freddie Mac New Multifamily Business Volume",
        frequency="quarterly", units="usd_billions", source="Freddie Mac Financial Supplement",
        classification="coincident",
    ),
}


def ensure_indicators(cur):
    ids = {}
    for slug, meta in INDICATORS.items():
        cur.execute("SELECT id FROM indicators WHERE slug = %s", (slug,))
        row = cur.fetchone()
        if row:
            ids[slug] = row[0]
            continue
        cur.execute(
            """INSERT INTO indicators (slug, name, frequency, units, source, classification,
                                       higher_is_better, is_public, verticals)
               VALUES (%s,%s,%s,%s,%s,%s,%s,true, ARRAY['multifamily'])
               RETURNING id""",
            (slug, meta["name"], meta["frequency"], meta["units"], meta["source"],
             meta["classification"], False if "delinquency" in slug else True),
        )
        ids[slug] = cur.fetchone()[0]
        print(f"created indicator {slug}")
    return ids


def national_region_id(cur):
    cur.execute("SELECT id FROM regions WHERE region_type = 'national' ORDER BY code LIMIT 1")
    return cur.fetchone()[0]


def insert_if_changed(cur, indicator_id, region_id, obs_date, value):
    cur.execute(
        """SELECT value FROM observations
           WHERE indicator_id=%s AND region_id=%s AND obs_date=%s AND revision=0""",
        (indicator_id, region_id, obs_date),
    )
    row = cur.fetchone()
    if row is not None:
        if abs(float(row[0]) - value) < 1e-9:
            return "unchanged"
        cur.execute(
            """INSERT INTO observations (indicator_id, region_id, obs_date, value, revision)
               VALUES (%s,%s,%s,%s,(SELECT COALESCE(MAX(revision),0)+1 FROM observations
                       WHERE indicator_id=%s AND region_id=%s AND obs_date=%s))""",
            (indicator_id, region_id, obs_date, value, indicator_id, region_id, obs_date),
        )
        return "revised"
    cur.execute(
        """INSERT INTO observations (indicator_id, region_id, obs_date, value, revision)
           VALUES (%s,%s,%s,%s,0)""",
        (indicator_id, region_id, obs_date, value),
    )
    return "inserted"


def guard(value, lo, hi, label):
    if value is None:
        print(f"  SKIP {label}: parse returned nothing")
        return False
    if not (lo <= value <= hi):
        print(f"  SKIP {label}: {value} outside sane band [{lo},{hi}] -- treated as parse failure")
        return False
    return True


def main():
    today = dt.date.today()
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    wrote = False
    try:
        with conn.cursor() as cur:
            ids = ensure_indicators(cur)
            region = national_region_id(cur)

            # ---- Fannie delinquency: try the last few monthly files ----
            for back in range(0, 4):
                d = (today.replace(day=1) - dt.timedelta(days=1)).replace(day=1)
                d = (d - dt.timedelta(days=32 * back)).replace(day=1)
                # month-end filename encodes the reporting month
                eom = (d.replace(day=28) + dt.timedelta(days=4)).replace(day=1) - dt.timedelta(days=1)
                url = fannie_url(eom)
                try:
                    pdf = get_with_retry(url)
                except Exception as e:  # noqa: BLE001
                    print(f"  fannie {eom:%Y-%m} unavailable: {e}")
                    continue
                mf, mdate = parse_fannie(pdf)
                if guard(mf, DQ_MIN, DQ_MAX, f"fnma_mf_delinquency {mdate}"):
                    r = insert_if_changed(cur, ids["fnma_mf_delinquency"], region, mdate, mf)
                    print(f"  fnma_mf_delinquency {mdate} = {mf}%  [{r}]")
                    wrote = wrote or r != "unchanged"
                break

            # ---- Freddie delinquency ----
            for back in range(0, 4):
                base = today.replace(day=1) - dt.timedelta(days=1)
                d = (base - dt.timedelta(days=32 * back)).replace(day=1)
                url = freddie_url(d)
                try:
                    pdf = get_with_retry(url)
                except Exception as e:  # noqa: BLE001
                    print(f"  freddie {d:%Y-%m} unavailable: {e}")
                    continue
                mf, mdate = parse_freddie(pdf)
                if guard(mf, DQ_MIN, DQ_MAX, f"fmcc_mf_delinquency {mdate}"):
                    r = insert_if_changed(cur, ids["fmcc_mf_delinquency"], region, mdate, mf)
                    print(f"  fmcc_mf_delinquency {mdate} = {mf}%  [{r}]")
                    wrote = wrote or r != "unchanged"
                break

        # volume series are quarterly and parsed from the financial supplements;
        # handled by a companion path (see ingest_gse_volume) to keep this file
        # focused. Delinquency is the monthly-moving signal.

        if wrote:
            with conn.cursor() as cur:
                cur.execute("SET statement_timeout = 0")
                cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_indicator_analytics")
            print("refreshed mv_indicator_analytics")
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
