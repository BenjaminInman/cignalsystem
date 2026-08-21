export const runtime = "nodejs";
export const revalidate = 3600;

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// The capital-markets family. invert=true means "up is healthy" (the yield
// curve): steepening is good, flattening is the warning — the opposite polarity
// from a spread, where widening is the warning.
const SERIES = [
  { slug: "baa_spread",   name: "BAA Corporate Spread", desc: "Investment-grade risk premium (BAA − 10Y)", invert: false },
  { slug: "hy_oas",       name: "High-Yield Spread",    desc: "Riskiest-credit premium (ICE BofA HY OAS)", invert: false },
  { slug: "yield_spread", name: "Yield Curve (10Y − 3M)", desc: "Recession-watch curve — steeper is healthier", invert: true },
];

async function history(slug) {
  if (!SB_URL || !SB_KEY) return [];
  try {
    // ~130 trading days back covers a 90-day sparkline plus the 90d lookback.
    const url =
      `${SB_URL}/rest/v1/v_indicator_analytics` +
      `?slug=eq.${slug}&region_type=eq.national` +
      `&select=obs_date,value&order=obs_date.desc&limit=140`;
    const res = await fetch(url, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

const round = (n, d = 2) => (n == null ? null : Math.round(n * 10 ** d) / 10 ** d);

export async function GET() {
  const items = [];
  for (const s of SERIES) {
    const rows = await history(s.slug); // desc: rows[0] is newest
    if (!rows || rows.length < 2) continue;
    const cur = +rows[0].value;
    const at = (n) => +rows[Math.min(n, rows.length - 1)].value;
    const d30 = cur - at(21); // ~21 trading days ≈ 1 month
    const d90 = cur - at(63); // ~63 ≈ 3 months
    const spark = rows.slice(0, 90).map((r) => round(+r.value, 3)).reverse();
    items.push({
      slug: s.slug,
      name: s.name,
      desc: s.desc,
      invert: s.invert,
      cur: round(cur, 2),
      d30: round(d30, 3),
      d90: round(d90, 3),
      spark,
      asof: rows[0].obs_date,
    });
  }

  // Family verdict: how many are leaning the tightening/stress direction on 90d.
  const stress = items.filter((i) =>
    i.invert ? i.d90 < -0.02 : i.d90 > 0.02
  ).length;
  const verdict = stress >= 2 ? "TIGHTENING" : stress === 0 ? "EASING" : "MIXED";

  return Response.json({ items, verdict });
}
