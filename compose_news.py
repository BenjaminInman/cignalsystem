#!/usr/bin/env python3
"""
Compose gated article drafts from already-extracted news facts.

Sibling to ingest_news.py. That job stops at facts; this one turns them into
articles. Runs after it on the same schedule and shares the same secrets, so
there is nothing new to configure.

Pipeline: read facts -> cluster same-event stories -> reconcile -> compose ->
gate -> write a draft. Nothing publishes on its own; every draft lands with
status='draft' and its gate result attached.

THE FIREWALL: the composer receives ONLY reconciled facts. It never sees
article titles, summaries or body text, so it cannot reproduce a publisher's
expression — facts are not copyrightable, expression is. Enforced by what we
pass, not by instruction.
"""
import datetime as dt
import hashlib
import json
import os
import re
import sys
import time

import psycopg2
import psycopg2.extras
import requests

DB_URL = os.environ.get("SUPABASE_DB_URL", "")
# Read lazily: drafts_tool.py imports this module purely to reuse gate(), and
# that path never calls the API, so it must not require the key to import.
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.environ.get("COMPOSE_MODEL", "claude-sonnet-4-6")
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"

LOOKBACK_DAYS = int(os.environ.get("COMPOSE_LOOKBACK_DAYS", "7"))
MAX_DRAFTS = int(os.environ.get("COMPOSE_MAX_DRAFTS", "2"))
SITE = os.environ.get("COMPOSE_SITE", "multifamily30x")
VERTICAL = os.environ.get("COMPOSE_VERTICAL", "multifamily")

# Multifamily30x is the operator lens: what someone running a property decides
# on. Capital-markets and distress facts belong to other properties, so they are
# read for context but never lead a piece here.
OPERATOR_CATEGORIES = ("rents", "occupancy", "supply", "demand")

# Gate thresholds. Deliberately strict to start — a high early rejection rate is
# the gate working. Tune against what it rejects, not toward a publish target.
MIN_FACTS = 4
MIN_NUMERIC_FACTS = 2
MIN_METRIC_FACTS = 1   # at least one fact tied to a tracked indicator
MIN_CONFIDENCE = 3.0          # news_facts.confidence is 1-5
MIN_BODY_PARAS = 2
MIN_TICKER = 4

STOP = set("""the a an and or but of in on for to from by with as at is are was were be been
it its this that these those new says say said report reports amid after before us percent
year years over up down more less than""".split())

PRESCRIPTIVE = [
    r"\bshould\b", r"\bmust\b", r"\bneed to\b", r"\bought to\b",
    r"\brecommend(s|ed|ation)?\b", r"\badvise[sd]?\b", r"\bwe suggest\b",
    r"\btake action\b", r"\bmake sure\b", r"\bbe sure to\b",
    r"\bthe play is\b", r"\byour move\b", r"\byou'?ll want to\b",
]
# Bare imperatives are the prescription pattern a modal-verb list misses.
# "Reallocate effort from chasing tenants to keeping them" contains no
# should/must/recommend but is unambiguously an instruction.
IMPERATIVE_VERBS = ("reallocate shift focus push cut defend prioritize move start stop reduce "
                    "increase track build use avoid keep hold tighten raise lower renegotiate "
                    "reprice budget invest allocate trim expand delay accelerate review audit").split()
IMPERATIVE_RE = re.compile(r"(?:^|[.!?]\s+)(" + "|".join(IMPERATIVE_VERBS) + r")\b", re.I)

# Hedging about how to READ a figure is not prescription. Allowed anywhere:
# "should be read/interpreted/treated/weighed/understood as ...".
HEDGE_RE = re.compile(
    r"\bshould(?:\s+not)?\s+be\s+(read|interpreted|treated|understood|weighed|taken|assumed|mistaken|viewed|seen|construed|regarded|confused)\b",
    re.I)


def log(msg):
    print(f"[{dt.datetime.utcnow().isoformat(timespec='seconds')}Z] {msg}", flush=True)


def db():
    return psycopg2.connect(DB_URL)


# The job creates its own table. The Actions runner already holds
# SUPABASE_DB_URL, so there is no separate migration step and nobody has to open
# a SQL editor. Every statement is guarded, so running it on each pass is a
# no-op once the table exists.
DDL = """
create table if not exists drafts (
  id            uuid primary key default gen_random_uuid(),
  site          text not null,
  vertical      text not null default 'multifamily',
  slug          text,
  headline      text,
  dek           text,
  body          jsonb not null,
  fact_ids      uuid[] not null default '{}',
  article_ids   uuid[] not null default '{}',
  corroboration int default 1,
  gate_pass     boolean default false,
  gate_failures jsonb default '[]'::jsonb,
  coverage      numeric,
  status        text default 'draft',
  model         text,
  created_at    timestamptz default now(),
  reviewed_at   timestamptz,
  published_at  timestamptz,
  unique (site, slug)
);
create index if not exists idx_drafts_status on drafts (site, status, created_at desc);
alter table drafts enable row level security;
"""

# The first run created these as bigint[]. Repair in place rather than dropping
# the table, and guard on the current type so this is a no-op afterwards.
REPAIR = """
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name='drafts' and column_name='fact_ids'
               and udt_name <> '_uuid') then
    -- the column default ('{}' as bigint[]) blocks an automatic cast, so drop
    -- it, change the type, then restore it
    alter table drafts alter column fact_ids    drop default;
    alter table drafts alter column article_ids drop default;
    alter table drafts alter column fact_ids    type uuid[] using fact_ids::text[]::uuid[];
    alter table drafts alter column article_ids type uuid[] using article_ids::text[]::uuid[];
    alter table drafts alter column fact_ids    set default '{}';
    alter table drafts alter column article_ids set default '{}';
  end if;
end $$;
"""

POLICY = """
drop policy if exists "read published drafts" on drafts;
create policy "read published drafts" on drafts for select using (status = 'published');
"""


def ensure_schema(conn):
    with conn.cursor() as cur:
        cur.execute(DDL)
        cur.execute(REPAIR)
        cur.execute(POLICY)
    conn.commit()
    log("schema ready (drafts)")


# ---------------------------------------------------------------------------
# Clustering — group stories covering the same event
# ---------------------------------------------------------------------------
def stem(w):
    if len(w) > 5 and w.endswith("ing"): w = w[:-3]
    elif len(w) > 4 and w.endswith("ed"): w = w[:-2]
    elif len(w) > 4 and w.endswith("es"): w = w[:-2]
    elif len(w) > 3 and w.endswith("s") and not w.endswith("ss"): w = w[:-1]
    if len(w) > 4 and w.endswith("e"): w = w[:-1]
    return w


def shingles(title):
    words = [stem(w) for w in re.sub(r"[^a-z0-9%.\s-]", " ", (title or "").lower()).split()
             if w and w not in STOP and len(w) > 1]
    out = set(words)
    for i in range(len(words) - 1):
        out.add(f"{words[i]}_{words[i+1]}")
    return out


def jaccard(a, b):
    if not a or not b:
        return 0.0
    inter = len(a & b)
    return inter / (len(a) + len(b) - inter)


def cluster(articles, threshold=0.20):
    """Single-linkage. Scoring against a union of the cluster's shingles inflates
    the denominator, making each new member harder to join and silently splitting
    large events — so compare against the best-matching member instead."""
    prepared = [dict(a, sh=shingles(a["title"])) for a in articles]
    prepared = [a for a in prepared if a["sh"]]
    clusters = []
    for a in prepared:
        best, best_score = None, 0.0
        for c in clusters:
            s = max((jaccard(a["sh"], m["sh"]) for m in c), default=0.0)
            if s > best_score:
                best_score, best = s, c
        if best is not None and best_score >= threshold:
            best.append(a)
        else:
            clusters.append([a])
    # Corroboration counts distinct SOURCES: three syndications of one wire story
    # are one source and must not inflate confidence.
    return sorted(clusters, key=lambda c: -len({m["source_name"] for m in c}))


# ---------------------------------------------------------------------------
# Reconciliation
# ---------------------------------------------------------------------------
def reconcile(facts):
    """One fact per metric+period. Higher confidence wins; a 'restatement' of a
    series the platform already measures is preferred over 'net_new' commentary
    when both describe the same metric, because the tracked series is the
    stronger evidence."""
    groups = {}
    for f in facts:
        key = (f["metric_slug"] or f["fact_text"][:60], f["period_end"], f["geography"])
        groups.setdefault(key, []).append(f)

    out = []
    for rows in groups.values():
        rows.sort(key=lambda r: (r["confidence"] or 0,
                                 1 if r["novelty"] == "restatement" else 0), reverse=True)
        best = dict(rows[0])
        best["corroboration"] = len({r["source_name"] for r in rows})
        out.append(best)

    out.sort(key=lambda f: (f["corroboration"], f["confidence"] or 0), reverse=True)
    for i, f in enumerate(out, 1):
        f["ref"] = f"f{i}"
    return out


# ---------------------------------------------------------------------------
# Composition — forced-tool, same pattern as ingest_news.py
# ---------------------------------------------------------------------------
COMPOSE_SYSTEM = """You write for a US multifamily publication read by owner-operators.
Its lens is operations: leasing, turns, staffing, systems, expenses, retention.

You receive ONLY a list of verified facts, each with a reference id. You have no
access to any source article. Write entirely from the supplied facts.

HARD RULES
- Every factual sentence cites the fact ids it rests on.
- Never state a number that does not appear in the fact list. No exceptions.
- Never infer a figure, trend or total that is not explicitly supplied. If you
  want to state a difference between two figures, you may not — cite both and
  let the reader see it.
- If the facts are too thin for a section, return fewer items. Do not pad.
- Plain declarative prose. No hype, no rhetorical questions.

THE SIGNAL LAYER IS OBSERVATIONAL ONLY.
- Describe what the pattern is consistent with. Never say what the reader should do.
- Banned: should, must, need to, ought, recommend, advise, we suggest, take
  action, make sure, be sure to, the play is, your move.
- Also banned: bare imperatives. Do not open a sentence with an instruction verb
  (reallocate, shift, focus, push, cut, defend, prioritize, trim...).
- Frame every read as correlation, not causation: "consistent with", "tends to
  accompany", "has historically coincided with".
- Prescription belongs to the training product and must never appear here."""


def compose_tool():
    seg = {
        "type": "object",
        "properties": {"text": {"type": "string"},
                       "fact_ids": {"type": "array", "items": {"type": "string"}}},
        "required": ["text", "fact_ids"],
    }
    return {
        "name": "record_article",
        "description": "Record the composed article.",
        "input_schema": {
            "type": "object",
            "properties": {
                "publishable": {"type": "boolean",
                                "description": "False if the facts are too thin to support an article."},
                "headline": {"type": "string"},
                "dek": {"type": "string"},
                "slug": {"type": "string"},
                "meta_description": {"type": "string"},
                "ticker": {"type": "array", "items": {
                    "type": "object",
                    "properties": {"label": {"type": "string"}, "value": {"type": "string"},
                                   "note": {"type": "string"},
                                   "fact_ids": {"type": "array", "items": {"type": "string"}}},
                    "required": ["label", "value", "fact_ids"]}},
                "facts_body": {"type": "array", "items": seg},
                "signal": {"type": "object", "properties": {
                    "cycle_read": seg, "leading": seg, "coincident": seg,
                    "lagging": seg, "pattern": seg, "read_with_care": seg},
                    "required": ["cycle_read", "pattern", "read_with_care"]},
            },
            "required": ["publishable", "headline", "dek", "slug", "facts_body", "signal"],
        },
    }


def fact_line(f):
    val = f"{f['value_numeric']}{f['unit'] or ''}" if f["value_numeric"] is not None else ""
    parts = [f"[{f['ref']}]", f["fact_text"]]
    if val:
        parts.append(f"({val})")
    if f["period_end"]:
        parts.append(f"period={f['period_end']}")
    if f["signal_role"]:
        parts.append(f"role={f['signal_role']}")
    parts.append(f"conf={f['confidence']}/5 corrob={f['corroboration']} {f['novelty'] or ''}")
    if f["is_estimate"]:
        parts.append("ESTIMATE")
    return " ".join(str(p) for p in parts if p)


def compose(facts):
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY is not set")
    user = ("FACTS:\n" + "\n".join(fact_line(f) for f in facts) +
            "\n\nCompose the article from these facts. Set publishable=false only if the "
            "facts are genuinely contradictory or entirely off-topic for an operator "
            "audience — not merely because you would prefer more of them.")
    payload = {
        "model": ANTHROPIC_MODEL, "max_tokens": 3000, "system": COMPOSE_SYSTEM,
        "tools": [compose_tool()],
        "tool_choice": {"type": "tool", "name": "record_article"},
        "messages": [{"role": "user", "content": user}],
    }
    headers = {"x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01",
               "content-type": "application/json"}
    for attempt in range(3):
        try:
            r = requests.post(ANTHROPIC_URL, headers=headers, json=payload, timeout=120)
            if r.status_code == 429 or r.status_code >= 500:
                time.sleep(5 * (attempt + 1)); continue
            r.raise_for_status()
            for b in r.json().get("content", []):
                if b.get("type") == "tool_use" and b.get("name") == "record_article":
                    return b["input"]
            return None
        except Exception as e:
            log(f"  compose error (attempt {attempt+1}): {e}")
            time.sleep(3 * (attempt + 1))
    return None


# ---------------------------------------------------------------------------
# Gate
# ---------------------------------------------------------------------------
NUM_RE = re.compile(r"-?\$?\d[\d,]*(?:\.\d+)?(?:%|bps|k|m|b)?", re.I)


def claim_numbers(text):
    """Only claim-like figures. Bare small integers are terminology ('5+ units',
    '30-year', 'Q2') and flagging them buries real hallucinations in noise."""
    out = set()
    for m in NUM_RE.finditer(str(text)):
        raw = m.group(0)
        norm = raw.lower().replace(",", "").replace("$", "").replace(" ", "")
        bare = re.sub(r"(%|bps|k|m|b)$", "", norm)
        try:
            big = abs(float(bare)) >= 1000
        except ValueError:
            continue
        if "." in bare or re.search(r"(%|bps|k|m|b)$", norm) or "," in raw or big:
            out.add(norm)
    return out


def allowed_numbers(facts):
    out = set()
    for f in facts:
        v = f["value_numeric"]
        if v is not None:
            for base in {str(v), str(abs(v)), str(v).rstrip("0").rstrip(".")}:
                out.add(base.lower())
                if f["unit"] in ("%", "bps"):
                    out.add(f"{base}{f['unit']}".lower())
            try:
                a = abs(float(v))
                if a >= 1000:
                    out.add(f"{a/1000:g}k"); out.add(f"{a/1000:.1f}k")
                if a >= 1e6:
                    out.add(f"{a/1e6:g}m"); out.add(f"{a/1e6:.1f}m")
            except (TypeError, ValueError):
                pass
        for src in (f["fact_text"], str(f["period_end"] or ""), str(f["period_start"] or "")):
            out |= claim_numbers(src)
    return out


def gate(draft, facts):
    failures = []
    refs = {f["ref"] for f in facts}
    allowed = allowed_numbers(facts)

    if len(facts) < MIN_FACTS:
        failures.append(f"only {len(facts)} facts (need {MIN_FACTS})")
    numeric = sum(1 for f in facts
                  if f["value_numeric"] is not None or claim_numbers(f["fact_text"]))
    if numeric < MIN_NUMERIC_FACTS:
        failures.append(f"only {numeric} numeric facts (need {MIN_NUMERIC_FACTS})")
    mean_conf = sum(f["confidence"] or 0 for f in facts) / max(len(facts), 1)
    if mean_conf < MIN_CONFIDENCE:
        failures.append(f"mean confidence {mean_conf:.1f} (need {MIN_CONFIDENCE})")
    if len(draft.get("facts_body") or []) < MIN_BODY_PARAS:
        failures.append(f"body has {len(draft.get('facts_body') or [])} paragraphs (need {MIN_BODY_PARAS})")
    if len(draft.get("ticker") or []) < MIN_TICKER:
        failures.append(f"ticker has {len(draft.get('ticker') or [])} cells (need {MIN_TICKER})")

    segments = []
    for i, c in enumerate(draft.get("ticker") or []):
        segments.append((f"ticker[{i}]", f"{c.get('label','')} {c.get('value','')} {c.get('note','')}", c.get("fact_ids") or []))
    for i, p in enumerate(draft.get("facts_body") or []):
        segments.append((f"facts_body[{i}]", p.get("text", ""), p.get("fact_ids") or []))
    for k, seg in (draft.get("signal") or {}).items():
        if isinstance(seg, dict):
            segments.append((f"signal.{k}", seg.get("text", ""), seg.get("fact_ids") or []))
    segments.append(("headline", draft.get("headline", ""), []))
    segments.append(("dek", draft.get("dek", ""), []))

    cited = set()
    for path, text, ids in segments:
        for fid in ids:
            if fid not in refs:
                failures.append(f"{path}: cites unknown fact id {fid}")
            else:
                cited.add(fid)
        for n in claim_numbers(text):
            if n not in allowed:
                failures.append(f'{path}: number "{n}" not present in fact set')
        if path.startswith(("facts_body", "signal.")) and not ids and not path.endswith("read_with_care"):
            failures.append(f"{path}: no fact_ids cited")

    for k, seg in (draft.get("signal") or {}).items():
        t = (seg or {}).get("text", "") if isinstance(seg, dict) else ""
        for pat in PRESCRIPTIVE:
            m = re.search(pat, t, re.I)
            if not m:
                continue
            # allow the epistemic use: "should be read as", "should not be taken as"
            if pat == r"\bshould\b" and HEDGE_RE.search(t):
                continue
            failures.append(f"signal.{k}: prescriptive language {pat} — belongs to the training product")
        m = IMPERATIVE_RE.search(t)
        if m:
            failures.append(f'signal.{k}: bare imperative "{m.group(1)}" — instruction, not observation')

    coverage = len(cited) / max(len(facts), 1)
    return (not failures), failures, coverage


# ---------------------------------------------------------------------------
# Read / write
# ---------------------------------------------------------------------------
def load_facts(conn):
    cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=LOOKBACK_DAYS)
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            select f.id, f.article_id, f.fact_text, f.category, f.geography,
                   f.metric_slug, f.value_numeric, f.unit, f.direction,
                   f.period_start, f.period_end, f.signal_role, f.novelty,
                   f.is_estimate, f.confidence,
                   a.title, a.url, a.published_at,
                   s.name as source_name, s.vertical
              from news_facts f
              join news_articles a on a.id = f.article_id
              join news_sources  s on s.id = a.source_id
             where a.published_at >= %s
               and a.status = 'extracted'
               and s.vertical = %s
               and f.category = any(%s)
             order by a.published_at desc
            """,
            (cutoff, VERTICAL, list(OPERATOR_CATEGORIES)),
        )
        return cur.fetchall()


def slugify(s):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", (s or "").lower())).strip("-")[:80]


def save_draft(conn, draft, facts, arts, ok, failures, coverage):
    slug = slugify(draft.get("slug") or draft.get("headline"))
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into drafts
              (site, vertical, slug, headline, dek, body, fact_ids, article_ids,
               corroboration, gate_pass, gate_failures, coverage, status, model)
            values (%s,%s,%s,%s,%s,%s,%s::uuid[],%s::uuid[],%s,%s,%s,%s,'draft',%s)
            on conflict (site, slug) do nothing
            returning id
            """,
            (SITE, VERTICAL, slug, draft.get("headline"), draft.get("dek"),
             json.dumps(draft), [str(f["id"]) for f in facts], [str(a) for a in sorted(arts)],
             max((f["corroboration"] for f in facts), default=1),
             ok, json.dumps(failures), round(coverage, 3), ANTHROPIC_MODEL),
        )
        return cur.fetchone() is not None


def main():
    if not DB_URL:
        log("SUPABASE_DB_URL is not set"); sys.exit(1)
    if not ANTHROPIC_API_KEY:
        log("ANTHROPIC_API_KEY is not set"); sys.exit(1)
    conn = db()
    conn.autocommit = False
    try:
        ensure_schema(conn)
        rows = load_facts(conn)
        log(f"facts in window: {len(rows)} (vertical={VERTICAL}, {LOOKBACK_DAYS}d, "
            f"categories={','.join(OPERATOR_CATEGORIES)})")
        if not rows:
            log("nothing to compose"); return

        by_article = {}
        for r in rows:
            by_article.setdefault(r["article_id"], []).append(r)
        articles = [{"article_id": aid, "title": fs[0]["title"],
                     "source_name": fs[0]["source_name"]}
                    for aid, fs in by_article.items()]

        clusters = cluster(articles)
        sizes = sorted((sum(len(by_article[m["article_id"]]) for m in c) for c in clusters), reverse=True)
        log(f"clusters: {len(clusters)} | facts per cluster (top 8): {sizes[:8]} | "
            f"clusters at/over floor({MIN_FACTS}): {sum(1 for n in sizes if n >= MIN_FACTS)}")

        written = 0
        for c in clusters:
            if written >= MAX_DRAFTS:
                break
            art_ids = [m["article_id"] for m in c]
            facts = reconcile([f for aid in art_ids for f in by_article[aid]])
            if len(facts) < MIN_FACTS:
                continue
            # Single-property development news clears the fact count but is not
            # operator signal. Require a link to a tracked series.
            if sum(1 for f in facts if f["metric_slug"]) < MIN_METRIC_FACTS:
                log(f"  skipped: {len(facts)} facts but none tied to a tracked indicator")
                continue
            log(f"  composing from {len(facts)} facts across {len(art_ids)} article(s)")

            draft = compose(facts)
            if not draft:
                log("  compose failed"); continue
            if not draft.get("publishable", True):
                log(f"  model declined: facts too thin ({len(facts)})"); continue

            ok, failures, coverage = gate(draft, facts)
            try:
                if save_draft(conn, draft, facts, art_ids, ok, failures, coverage):
                    conn.commit(); written += 1
                    log(f"  {'PASS' if ok else 'HELD'} {draft.get('headline','')[:64]} "
                        f"| facts={len(facts)} coverage={coverage:.0%} failures={len(failures)}")
                    for f in failures[:5]:
                        log(f"      x {f}")
                else:
                    conn.rollback(); log("  duplicate slug, skipped")
            except Exception as e:
                conn.rollback(); log(f"  save error: {e}")

        log(f"done. drafts written={written}")
    finally:
        conn.close()


if __name__ == "__main__":
    try:
        main()
    except KeyError as e:
        log(f"missing env var: {e}")
        sys.exit(1)
