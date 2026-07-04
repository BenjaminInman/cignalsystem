export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Curated hero set: 12 national indicators across the three timing layers.
// type drives the displayed metric, the green/amber/red reading, AND the
// "where it sits" range gauge:
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

const cutoff = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 7);
  return d.toISOString().slice(0, 10);
})();

async function history(slug) {
  const r = await fetch(
    `${SUPA}/rest/v1/v_indicator_analytics?slug=eq.${slug}&region_code=eq.US` +
      `&obs_date=gte.${cutoff}&select=obs_date,value,yoy_change,zscore_12&order=obs_date.desc&limit=400`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, cache: "no-store" }
  );
  if (!r.ok) return [];
  return (await r.json()) || [];
}

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const sgn = (n) => (n >= 0 ? "+" : "");

// The metric a given indicator's value/range is measured in.
function metricOf(cfg, row) {
  const v = Number(row.value);
  const ya = row.yoy_change == null ? null : Number(row.yoy_change);
  if (cfg.type === "growth" || cfg.type === "inflation") {
    return ya != null && v - ya !== 0 ? (ya / (v - ya)) * 100 : null;
  }
  return v; // rate, gdp
}

function compute(cfg, rows) {
  if (!rows || !rows.length || rows[0].value == null) return null;
  const cur = metricOf(cfg, rows[0]);
  if (cur == null || !Number.isFinite(cur)) return null;
  const yoyAbs = rows[0].yoy_change == null ? null : Number(rows[0].yoy_change);
  const z = rows[0].zscore_12 == null ? null : Number(rows[0].zscore_12);

  const fmt = (x) =>
    cfg.type === "rate" ? `${x.toFixed(1)}%` : `${sgn(x)}${x.toFixed(1)}%`;

  let sentiment;
  if (cfg.slug === "employment") {
    // Jobs: any positive job growth is green; still-negative but improving
    // (trending the right way) is yellow; negative and not improving is red.
    const back = metricOf(cfg, rows[Math.min(3, rows.length - 1)]);
    const improving = back != null && Number.isFinite(back) ? cur > back : false;
    sentiment = cur > 0 ? "g" : improving ? "a" : "r";
  } else if (cfg.slug === "treasury_10y") {
    // Rates: level bands — 4.5% is "not bad" (yellow), not red.
    sentiment = cur <= 3.5 ? "g" : cur <= 5.0 ? "a" : "r";
  } else if (cfg.slug === "rental_vacancy") {
    // Vacancy: occupancy bands — >92% occ (<8% vac) green, 90-92% (8-10%)
    // yellow, <90% occ (>10% vac) red.
    sentiment = cur < 8 ? "g" : cur <= 10 ? "a" : "r";
  } else if (cfg.slug === "unemployment") {
    // Unemployment: healthy middle band 2.5-4.5% green; below 2.5% (too hot)
    // yellow; 4.5-5% yellow; above 5% red.
    sentiment = cur < 2.5 ? "a" : cur <= 4.5 ? "g" : cur <= 5 ? "a" : "r";
  } else if (cfg.type === "growth") sentiment = cur > 0.5 ? "g" : cur < -0.5 ? "r" : "a";
  else if (cfg.type === "inflation") sentiment = cur <= 3 ? "g" : cur <= 4 ? "a" : "r";
  else if (cfg.type === "rate") {
    const d = yoyAbs ?? 0;
    sentiment = d > 0.15 ? "r" : d < -0.15 ? "g" : "a";
  } else {
    // GDP: normal 4-5% green; 3.5-4% and 5-6% yellow; <3.5% or >6% red.
    sentiment =
      cur >= 4 && cur <= 5 ? "g"
      : (cur >= 3.5 && cur < 4) || (cur > 5 && cur <= 6) ? "a"
      : "r";
  }

  // where it sits: position of the current reading within its typical range.
  // Use the 5th-95th percentile band so one-off outliers (e.g. 2020) don't
  // blow out the range and flatten every reading to the middle.
  const series = rows
    .map((r) => metricOf(cfg, r))
    .filter((x) => x != null && Number.isFinite(x))
    .sort((a, b) => a - b);
  const q = (p) => series[clamp(Math.round((p / 100) * (series.length - 1)), 0, series.length - 1)];
  const low = series.length ? q(5) : cur;
  const high = series.length ? q(95) : cur;
  const position = high > low ? Math.round(clamp(((cur - low) / (high - low)) * 100, 0, 100)) : 50;
  const oldest = rows[rows.length - 1]?.obs_date;
  const span =
    oldest && rows[0]?.obs_date
      ? Math.max(1, Math.round((new Date(rows[0].obs_date) - new Date(oldest)) / 31557600000))
      : null;

  const weight = z == null ? 0.6 : clamp(Math.abs(z), 0.3, 2);
  return {
    slug: cfg.slug,
    label: cfg.label,
    role: cfg.role,
    value: fmt(cur),
    sentiment,
    weight: Math.round(weight * 100) / 100,
    position,
    low: fmt(low),
    high: fmt(high),
    span,
    asOf: rows[0].obs_date,
  };
}

export async function GET() {
  try {
    const hist = await Promise.all(CONFIG.map((c) => history(c.slug)));
    const indicators = CONFIG.map((c, i) => compute(c, hist[i])).filter(Boolean);
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
