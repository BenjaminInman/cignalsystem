export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Curated hero set: 12 national indicators across the three timing layers.
// type drives both the displayed value and the green/amber/red reading:
//   growth    -> YoY% of a level; up is good
//   inflation -> YoY% price change; low/at-target is good, hot is bad
//   rate      -> a level rate; rising is bad (rates, vacancy, unemployment)
//   gdp       -> already an annualized growth rate; read off the level
const CONFIG = [
  { slug: "permits_5plus", label: "Permits", role: "leading", type: "growth" },
  { slug: "treasury_10y", label: "Rates", role: "leading", type: "rate" },
  { slug: "employment", label: "Jobs", role: "leading", type: "growth" },
  { slug: "ppi", label: "PPI", role: "leading", type: "inflation" },
  { slug: "gdp", label: "GDP", role: "coincident", type: "gdp" },
  { slug: "real_pce", label: "Real PCE", role: "coincident", type: "growth" },
  { slug: "rental_vacancy", label: "Vacancy", role: "coincident", type: "rate" },
  { slug: "zori_national_mf", label: "Rent", role: "coincident", type: "growth" },
  { slug: "unemployment", label: "Unemp.", role: "trailing", type: "rate" },
  { slug: "wage_growth", label: "Wages", role: "trailing", type: "growth" },
  { slug: "cpi_headline", label: "CPI", role: "trailing", type: "inflation" },
  { slug: "pce_inflation", label: "Inflation", role: "trailing", type: "inflation" },
];

async function latest(slug) {
  const r = await fetch(
    `${SUPA}/rest/v1/v_indicator_analytics?slug=eq.${slug}&region_code=eq.US` +
      `&select=obs_date,value,yoy_change,zscore_12&order=obs_date.desc&limit=1`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, cache: "no-store" }
  );
  if (!r.ok) return null;
  const j = await r.json();
  return j && j[0] ? j[0] : null;
}

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const sgn = (n) => (n >= 0 ? "+" : "");

function compute(cfg, row) {
  if (!row || row.value == null) return null;
  const value = Number(row.value);
  const yoyAbs = row.yoy_change == null ? null : Number(row.yoy_change);
  const z = row.zscore_12 == null ? null : Number(row.zscore_12);
  const yoyPct =
    yoyAbs != null && value - yoyAbs !== 0 ? (yoyAbs / (value - yoyAbs)) * 100 : null;

  let display, sentiment;
  if (cfg.type === "growth") {
    const p = yoyPct ?? 0;
    display = `${sgn(p)}${p.toFixed(1)}%`;
    sentiment = p > 0.5 ? "g" : p < -0.5 ? "r" : "a";
  } else if (cfg.type === "inflation") {
    const p = yoyPct ?? 0;
    display = `${sgn(p)}${p.toFixed(1)}%`;
    sentiment = p <= 2.5 ? "g" : p <= 4 ? "a" : "r";
  } else if (cfg.type === "rate") {
    display = `${value.toFixed(1)}%`;
    const d = yoyAbs ?? 0; // lower is better -> rising = deteriorating
    sentiment = d > 0.15 ? "r" : d < -0.15 ? "g" : "a";
  } else {
    // gdp: annualized growth rate read off the level
    display = `${sgn(value)}${value.toFixed(1)}%`;
    sentiment = value >= 1.5 ? "g" : value < 0 ? "r" : "a";
  }

  // Wedge size = how far the reading sits from its own normal (|z|), floored so
  // a near-normal indicator still shows a visible slice.
  const weight = z == null ? 0.6 : clamp(Math.abs(z), 0.3, 2);
  return {
    slug: cfg.slug,
    label: cfg.label,
    role: cfg.role,
    value: display,
    sentiment,
    weight: Math.round(weight * 100) / 100,
    asOf: row.obs_date,
  };
}

export async function GET() {
  try {
    const rows = await Promise.all(CONFIG.map((c) => latest(c.slug)));
    const indicators = CONFIG.map((c, i) => compute(c, rows[i])).filter(Boolean);
    const balance = { up: 0, down: 0, turn: 0, total: indicators.length };
    for (const x of indicators) {
      if (x.sentiment === "g") balance.up++;
      else if (x.sentiment === "r") balance.down++;
      else balance.turn++;
    }
    const asOf = indicators.map((x) => x.asOf).sort().slice(-1)[0] || null;
    return Response.json({ asOf, indicators, balance });
  } catch {
    return Response.json(
      { indicators: [], balance: { up: 0, down: 0, turn: 0, total: 0 }, error: "Cycle wheel unavailable." },
      { status: 502 }
    );
  }
}
