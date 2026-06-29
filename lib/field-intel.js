// Field Intel (Soft Signals) — net-new facts scrubbed from public reporting,
// read from the v_field_intel view. SOFT layer: kept entirely separate from the
// measured Hard-signal series, so it never touches observations/analytics math.
// Mirrors lib/ticker.js's PostgREST pattern.

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const CAT_LABEL = {
  capital_markets: "Capital Markets",
  supply: "Supply",
  demand: "Demand",
  rents: "Rents",
  occupancy: "Occupancy",
  rates: "Rates",
  policy: "Policy",
  distress: "Distress",
  macro: "Macro",
  other: "Signal",
};

// Generic words that don't identify a specific deal/story.
const STOP = new Set([
  "about", "after", "again", "approximately", "being", "could", "first", "into",
  "mixed", "other", "their", "there", "these", "those", "through", "under",
  "value", "valued", "which", "while", "would", "group", "company", "develop",
  "development", "project", "market", "estate", "reported", "includes",
  "including", "remains", "across", "around", "between",
]);

function fmtDate(s) {
  if (!s) return "";
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Distinctive tokens: figures/$ amounts, and entity-ish words (len>=5, non-stop).
function strongTokens(s) {
  const toks = (s || "").toLowerCase().match(/[a-z0-9.]+/g) || [];
  const out = new Set();
  for (const t of toks) {
    if (/\d/.test(t) && t.length >= 2) out.add(t);
    else if (t.length >= 5 && !STOP.has(t)) out.add(t);
  }
  return out;
}

function sharedCount(a, b) {
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n;
}

export async function getFieldIntel(limit = 9) {
  if (!SB_URL || !SB_KEY) return [];
  try {
    const url =
      `${SB_URL}/rest/v1/v_field_intel` +
      `?is_net_new=eq.true` +
      `&select=fact_text,category,signal_role,source_name,source_tier,article_url,published_at,metric_slug` +
      `&order=published_at.desc&limit=80`;
    const res = await fetch(url, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const rows = await res.json();

    // 1) one representative fact per source article (prefer metric-linked, then longest)
    const byArticle = new Map();
    for (const r of rows) {
      const key = r.article_url || r.fact_text;
      const cur = byArticle.get(key);
      const rRole = !!r.signal_role;
      const cRole = cur && !!cur.signal_role;
      const better =
        !cur ||
        (rRole && !cRole) ||
        (rRole === cRole && (r.fact_text || "").length > (cur.fact_text || "").length);
      if (better) byArticle.set(key, r);
    }
    const reps = [...byArticle.values()].sort(
      (a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0)
    );

    // 2) drop cross-article repeats of the same deal (>=3 shared distinctive tokens)
    const kept = [];
    const keptTokens = [];
    for (const r of reps) {
      const tk = strongTokens(r.fact_text || "");
      if (keptTokens.some((prev) => sharedCount(tk, prev) >= 3)) continue;
      kept.push(r);
      keptTokens.push(tk);
      if (kept.length >= limit) break;
    }

    return kept.map((r) => ({
      fact: r.fact_text,
      category: CAT_LABEL[r.category] || "Signal",
      role: r.signal_role || null,
      source: r.source_name,
      tier: r.source_tier,
      url: r.article_url || null,
      date: fmtDate(r.published_at),
    }));
  } catch {
    return [];
  }
}
