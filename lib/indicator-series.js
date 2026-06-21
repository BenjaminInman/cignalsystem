// Canonical display spec for each comparison series.
//
// The Indicators tab never shows raw stored values — it shows a DISPLAYED form
// (CPI index level -> YoY %, employment level -> monthly net change, etc.).
// The comparison chart must match that, or a line labeled "Inflation" would
// plot the ~330 CPI index instead of the ~4% rate. This module is the single
// place that maps a slug to { transform, unit, group } and applies it to the
// full first-print history pulled from v_indicator_analytics.
//
// group is used by the chart to decide when several series share one axis
// (all "pct" overlay cleanly) vs. when normalising (Indexed) is the better read.

export const SERIES_SPEC = {
  // Supply / demand
  permits_5plus:      { transform: "raw",      unit: "K SAAR", group: "count", round: 0 },
  absorption:         { transform: "raw",      unit: "%",      group: "pct",   round: 1 },
  days_on_market:     { transform: "raw",      unit: "days",   group: "days",  round: 0 },
  rental_vacancy:     { transform: "raw",      unit: "%",      group: "pct",   round: 1 },
  // Performance
  cpi_rent:           { transform: "yoy",      unit: "% YoY",  group: "pct",   round: 1 },
  renter_delinquency: { transform: "raw",      unit: "%",      group: "pct",   round: 1 },
  cap_rate:           { transform: "raw",      unit: "%",      group: "pct",   round: 2 },
  // Macro
  wage_growth:        { transform: "yoy",      unit: "% YoY",  group: "pct",   round: 1 },
  employment:         { transform: "mom_diff", unit: "K MoM",  group: "count", round: 0 },
  gdp:                { transform: "raw",      unit: "%",      group: "pct",   round: 1 },
  real_pce:           { transform: "yoy",      unit: "% YoY",  group: "pct",   round: 1 },
  consumer_sentiment: { transform: "raw",      unit: "index",  group: "index", round: 1 },
  cpi_headline:       { transform: "yoy",      unit: "% YoY",  group: "pct",   round: 1 },
  fed_funds:          { transform: "raw",      unit: "%",      group: "pct",   round: 2 },
  yield_spread:       { transform: "raw",      unit: "pp",     group: "pct",   round: 2 },
  initial_claims:     { transform: "scale_k",  unit: "K",      group: "count", round: 0 },
  cli_oecd:           { transform: "raw",      unit: "index",  group: "index", round: 1 },
  // Capital
  foreclosure:        { transform: "raw",      unit: "%",      group: "pct",   round: 2 },
  cre_delinquency:    { transform: "raw",      unit: "%",      group: "pct",   round: 2 },
};

const DAY = 86400000;

// YoY %: for each point, find the observation ~12 months earlier (by date,
// within 45 days) and compute the percent change. Works for monthly and
// quarterly series; points without a prior-year match are dropped.
function yoy(points) {
  const ts = points.map((p) => Date.parse(`${p.d}T00:00:00Z`));
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const d = new Date(ts[i]);
    const target = Date.UTC(d.getUTCFullYear() - 1, d.getUTCMonth(), d.getUTCDate());
    let best = null, bestDiff = Infinity;
    for (let j = 0; j <= i; j++) {
      const diff = Math.abs(ts[j] - target);
      if (diff < bestDiff) { bestDiff = diff; best = points[j]; }
    }
    if (best && bestDiff <= 45 * DAY && best.v) {
      out.push({ d: points[i].d, v: (points[i].v / best.v - 1) * 100 });
    }
  }
  return out;
}

// Month-over-month net change in the level (e.g., PAYEMS -> net new jobs).
function momDiff(points) {
  const out = [];
  for (let i = 1; i < points.length; i++) out.push({ d: points[i].d, v: points[i].v - points[i - 1].v });
  return out;
}

// Apply the canonical display transform. `points` is ascending [{d, v}] of raw
// first-print values. Returns { unit, group, round, points } in displayed form.
export function transformSeries(slug, points) {
  const spec = SERIES_SPEC[slug] || { transform: "raw", unit: "", group: "raw", round: 2 };
  let pts;
  if (spec.transform === "scale_k") pts = points.map((p) => ({ d: p.d, v: p.v / 1000 }));
  else if (spec.transform === "yoy") pts = yoy(points);
  else if (spec.transform === "mom_diff") pts = momDiff(points);
  else pts = points.map((p) => ({ d: p.d, v: p.v }));
  return { unit: spec.unit, group: spec.group, round: spec.round, points: pts };
}
