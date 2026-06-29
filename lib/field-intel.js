// Field Intel (Soft Signals) — net-new facts scrubbed from public reporting,
// read from the v_field_intel view. This is the SOFT layer: kept entirely
// separate from the measured Hard-signal series, so it never touches the
// observations / analytics math. Mirrors lib/ticker.js's PostgREST pattern.

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

function fmtDate(s) {
  if (!s) return "";
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Collapse near-identical facts (multiple outlets reporting the same deal),
// keeping the freshest of each.
function dedupe(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const key = (r.fact_text || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").slice(0, 55);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export async function getFieldIntel(limit = 9) {
  if (!SB_URL || !SB_KEY) return [];
  try {
    const url =
      `${SB_URL}/rest/v1/v_field_intel` +
      `?is_net_new=eq.true` +
      `&select=fact_text,category,signal_role,source_name,source_tier,article_url,published_at,metric_slug` +
      `&order=published_at.desc&limit=${limit * 3}`;
    const res = await fetch(url, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return dedupe(rows)
      .slice(0, limit)
      .map((r) => ({
        fact: r.fact_text,
        category: CAT_LABEL[r.category] || "Signal",
        role: r.signal_role || null, // leading | coincident | lagging
        source: r.source_name,
        tier: r.source_tier,
        url: r.article_url || null,
        date: fmtDate(r.published_at),
      }));
  } catch {
    return [];
  }
}
