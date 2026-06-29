#!/usr/bin/env python3
"""
ingest_news.py — Cignal System news fact-engine.

Flow:  RSS metadata  ->  dedupe vs DB  ->  Anthropic forced-tool extraction
       (facts only, bias stripped, evenhanded)  ->  news_articles + news_facts

Copyright firewall: we store extracted FACTS and our own neutral synopsis only.
Article bodies are never persisted.

Env (GitHub Actions secrets — already present in the repo's secret store):
  SUPABASE_DB_URL    session-pooler Postgres URI
  ANTHROPIC_API_KEY  Messages API key

Matches the existing ingestion family (ingest_zori.py / ingest_bls.py):
psycopg2 over SUPABASE_DB_URL, insert-if-new, run from a cron workflow.
"""

import os
import sys
import json
import time
import hashlib
import datetime as dt

import requests
import feedparser
import psycopg2
import psycopg2.extras

DB_URL = os.environ["SUPABASE_DB_URL"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
ANTHROPIC_MODEL = "claude-sonnet-4-6"
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"

# How far back to consider an entry "fresh" on each run.
LOOKBACK_DAYS = 14
# Cap per run so a backfill / busy news day can't blow the Action budget.
MAX_ARTICLES_PER_RUN = 120

# Browser UA — several feeds (Cloudflare-fronted) 403 the default feedparser UA.
FEED_UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                         "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"}

# ---------------------------------------------------------------------------
# Extraction contract
# ---------------------------------------------------------------------------
# Allowed indicator slugs the model may attach a fact to. Loaded live from the
# DB at runtime (see load_indicator_slugs); this constant is the fallback set.
FALLBACK_SLUGS = [
    "employment", "mf_starts", "mf_permits", "rental_vacancy", "cpi_rent",
    "cpi_shelter", "days_on_market", "mortgage_30y", "treasury_10y",
    "fed_funds", "unemployment", "wage_growth", "gdp", "real_pce",
    "consumer_sentiment", "headline_cpi", "ppi", "pce_inflation",
    "aimi", "cap_rate", "absorption", "foreclosure",
]

# Platform signal-role classification (the thesis spine). The model uses this
# to tag each metric-linked fact so qualitative facts line up with the wheel.
SIGNAL_ROLE = {
    "mf_permits": "leading", "mf_starts": "leading",
    "treasury_10y": "leading", "mortgage_30y": "leading",
    "fed_funds": "leading", "employment": "leading", "ppi": "leading",
    "gdp": "coincident", "real_pce": "coincident",
    "rental_vacancy": "coincident", "cpi_rent": "coincident",
    "unemployment": "lagging", "wage_growth": "lagging",
    "cpi_shelter": "lagging", "headline_cpi": "lagging",
    "pce_inflation": "lagging",
}

EXTRACTION_SYSTEM = """You are a fact-extraction engine for a multifamily real \
estate market-intelligence platform. From the supplied headline and summary you \
extract ONLY verifiable, attributable factual claims relevant to multifamily / \
commercial real estate, housing, or the macro economy that drives them.

Hard rules:
- Facts only. A fact is a checkable statement about what happened, a measured \
value, a reported figure, an announced policy, or a stated forecast.
- Strip ALL editorial framing in EVERY direction: sentiment adjectives, spin, \
opinion, speculation, and partisan or political coloring. Neutralize tone. \
Never characterize any person, party, or policy as good or bad — report only \
what was stated or done.
- Discard anything that is pure opinion, prediction-as-rhetoric, or commentary \
with no checkable core. If nothing checkable remains, return zero facts.
- Phrase each fact in your own plain words. Do not copy sentences from the input.
- When a fact carries a forecast/estimate rather than a reported actual, set \
is_estimate=true.
- Attach metric_slug ONLY from the provided allowed list, and only when the \
fact clearly maps to that indicator. Leave null otherwise.
- period_start/period_end describe the time the fact is ABOUT, not the publish \
date. Use ISO dates; leave null if not determinable.
- NOVELTY (important): classify each fact as one of two values.
  * "restatement" — the fact merely repeats an official metric/series that a \
market-intelligence platform already ingests directly (e.g. "multifamily starts \
fell 8%", "CPI rose 0.3%", "the 10-year Treasury is at 4.2%"). These are echoes \
of measured data, useful only as mild corroboration.
  * "net_new" — information NOT derivable from a standard economic series: \
forward-looking commentary or guidance, deal- or property-level color, a policy \
or regulatory announcement, financing/transaction activity, or stated sentiment. \
This is the high-value slice. When unsure, prefer "net_new" only if the fact adds \
something a data feed could not already tell you.
"""


def log(msg: str) -> None:
    print(f"[{dt.datetime.utcnow().isoformat(timespec='seconds')}Z] {msg}", flush=True)


def db():
    return psycopg2.connect(DB_URL)


def load_active_sources(conn):
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "select id, name, feed_url, tier from news_sources "
            "where is_active = true and feed_url is not null"
        )
        return cur.fetchall()


def load_indicator_slugs(conn):
    try:
        with conn.cursor() as cur:
            cur.execute("select slug from indicators")
            slugs = [r[0] for r in cur.fetchall()]
            return slugs or FALLBACK_SLUGS
    except Exception:
        return FALLBACK_SLUGS


def content_hash(url: str, title: str, published: str) -> str:
    return hashlib.sha256(f"{url}|{title}|{published}".encode("utf-8")).hexdigest()


def existing_hashes(conn, hashes):
    if not hashes:
        return set()
    with conn.cursor() as cur:
        cur.execute(
            "select content_hash from news_articles where content_hash = any(%s)",
            (list(hashes),),
        )
        return {r[0] for r in cur.fetchall()}


def parse_published(entry):
    for key in ("published_parsed", "updated_parsed"):
        t = entry.get(key)
        if t:
            return dt.datetime(*t[:6], tzinfo=dt.timezone.utc)
    return None


def fetch_candidates(source):
    """Return new-ish entries from one feed as dicts."""
    out = []
    try:
        r = requests.get(source["feed_url"], headers=FEED_UA, timeout=25)
        r.raise_for_status()
        feed = feedparser.parse(r.content)
    except Exception as e:
        log(f"  feed error {source['name']}: {type(e).__name__}")
        return out

    cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=LOOKBACK_DAYS)
    for e in feed.entries:
        pub = parse_published(e)
        if pub and pub < cutoff:
            continue
        title = (e.get("title") or "").strip()
        url = (e.get("link") or "").strip()
        if not title or not url:
            continue
        # RSS summary is the only body text we touch — and only to extract facts.
        summary = (e.get("summary") or e.get("description") or "").strip()
        pub_iso = pub.isoformat() if pub else ""
        out.append({
            "source_id": source["id"],
            "title": title,
            "url": url,
            "summary": summary,
            "published_at": pub,
            "content_hash": content_hash(url, title, pub_iso),
        })
    return out


# ---------------------------------------------------------------------------
# Anthropic forced-tool extraction
# ---------------------------------------------------------------------------
def extraction_tool(allowed_slugs):
    return {
        "name": "record_facts",
        "description": "Record the neutral synopsis and the list of extracted facts.",
        "input_schema": {
            "type": "object",
            "properties": {
                "relevant": {
                    "type": "boolean",
                    "description": "False if the article has no multifamily/CRE/macro relevance.",
                },
                "neutral_summary": {
                    "type": "string",
                    "description": "1-2 sentence neutral synopsis in your own words. No verbatim text.",
                },
                "facts": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "fact_text": {"type": "string"},
                            "category": {
                                "type": "string",
                                "enum": ["rents", "occupancy", "supply", "capital_markets",
                                         "rates", "policy", "demand", "distress", "macro", "other"],
                            },
                            "geography": {"type": "string"},
                            "metric_slug": {"type": "string", "enum": allowed_slugs + [""]},
                            "value_numeric": {"type": ["number", "null"]},
                            "unit": {"type": "string"},
                            "direction": {"type": "string", "enum": ["up", "down", "flat", ""]},
                            "period_start": {"type": "string"},
                            "period_end": {"type": "string"},
                            "is_estimate": {"type": "boolean"},
                            "novelty": {"type": "string", "enum": ["net_new", "restatement"]},
                            "confidence": {"type": "integer", "minimum": 1, "maximum": 5},
                        },
                        "required": ["fact_text", "category", "novelty", "confidence"],
                    },
                },
            },
            "required": ["relevant", "facts"],
        },
    }


def extract_facts(article, allowed_slugs):
    user = (
        f"Allowed metric_slug values: {', '.join(allowed_slugs)}\n\n"
        f"HEADLINE: {article['title']}\n\n"
        f"SUMMARY: {article['summary'] or '(none provided)'}\n\n"
        f"Published: {article['published_at'].date() if article['published_at'] else 'unknown'}\n\n"
        "Extract the facts."
    )
    payload = {
        "model": ANTHROPIC_MODEL,
        "max_tokens": 4000,
        "system": EXTRACTION_SYSTEM,
        "tools": [extraction_tool(allowed_slugs)],
        "tool_choice": {"type": "tool", "name": "record_facts"},
        "messages": [{"role": "user", "content": user}],
    }
    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    for attempt in range(3):
        try:
            r = requests.post(ANTHROPIC_URL, headers=headers, json=payload, timeout=90)
            if r.status_code == 429 or r.status_code >= 500:
                time.sleep(5 * (attempt + 1))
                continue
            r.raise_for_status()
            blocks = r.json().get("content", [])
            for b in blocks:
                if b.get("type") == "tool_use" and b.get("name") == "record_facts":
                    return b["input"]
            return None
        except Exception as e:
            log(f"  extract error (attempt {attempt+1}): {e}")
            time.sleep(3 * (attempt + 1))
    return None


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------
def clean_date(s):
    if not s:
        return None
    try:
        return dt.date.fromisoformat(s[:10])
    except Exception:
        return None


def persist(conn, article, extraction, allowed_slugs):
    with conn.cursor() as cur:
        if not extraction or not extraction.get("relevant", True):
            cur.execute(
                "insert into news_articles "
                "(source_id, url, title, published_at, content_hash, status) "
                "values (%s,%s,%s,%s,%s,'skipped') "
                "on conflict (content_hash) do nothing",
                (article["source_id"], article["url"], article["title"],
                 article["published_at"], article["content_hash"]),
            )
            return 0

        cur.execute(
            "insert into news_articles "
            "(source_id, url, title, published_at, content_hash, neutral_summary, status) "
            "values (%s,%s,%s,%s,%s,%s,'extracted') "
            "on conflict (content_hash) do nothing returning id",
            (article["source_id"], article["url"], article["title"],
             article["published_at"], article["content_hash"],
             extraction.get("neutral_summary")),
        )
        row = cur.fetchone()
        if not row:                       # raced/duplicate
            return 0
        article_id = row[0]

        n = 0
        for f in extraction.get("facts", []):
            slug = (f.get("metric_slug") or "").strip() or None
            if slug and slug not in allowed_slugs:
                slug = None
            role = SIGNAL_ROLE.get(slug) if slug else None
            direction = (f.get("direction") or "").strip() or None
            unit = (f.get("unit") or "").strip() or None
            geo = (f.get("geography") or "").strip() or None
            novelty = f.get("novelty")
            if novelty not in ("net_new", "restatement"):
                novelty = None
            cur.execute(
                "insert into news_facts "
                "(article_id, fact_text, category, geography, metric_slug, "
                " value_numeric, unit, direction, period_start, period_end, "
                " signal_role, novelty, is_estimate, confidence) "
                "values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (article_id, f["fact_text"], f["category"], geo, slug,
                 f.get("value_numeric"), unit, direction,
                 clean_date(f.get("period_start")), clean_date(f.get("period_end")),
                 role, novelty, bool(f.get("is_estimate", False)), f.get("confidence")),
            )
            n += 1
        return n


def main():
    conn = db()
    conn.autocommit = False
    try:
        sources = load_active_sources(conn)
        allowed_slugs = load_indicator_slugs(conn)
        log(f"sources with feeds: {len(sources)} | allowed slugs: {len(allowed_slugs)}")

        candidates = []
        for s in sources:
            found = fetch_candidates(s)
            candidates.extend(found)
            log(f"  {s['name']}: {len(found)} candidate(s)")

        # dedupe within batch + against DB
        seen, unique = set(), []
        for c in candidates:
            if c["content_hash"] in seen:
                continue
            seen.add(c["content_hash"])
            unique.append(c)
        already = existing_hashes(conn, [c["content_hash"] for c in unique])
        fresh = [c for c in unique if c["content_hash"] not in already][:MAX_ARTICLES_PER_RUN]
        log(f"fresh to process: {len(fresh)}")

        total_facts = 0
        for i, art in enumerate(fresh, 1):
            extraction = extract_facts(art, allowed_slugs)
            try:
                total_facts += persist(conn, art, extraction, allowed_slugs)
                conn.commit()
            except Exception as e:
                conn.rollback()
                log(f"  persist error: {e}")
            if i % 10 == 0:
                log(f"  ...{i}/{len(fresh)} processed")

        log(f"done. articles processed={len(fresh)} facts inserted={total_facts}")
    finally:
        conn.close()


if __name__ == "__main__":
    try:
        main()
    except KeyError as e:
        log(f"missing env var: {e}")
        sys.exit(1)
