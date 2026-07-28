// Cycle-wheel calibration — the single source of truth for how each indicator
// is placed on the four-phase cycle clock.
//
// For each indicator:
//   cls      leading | coincident | trailing  (which ring it sits on)
//   polarity +1 if higher = later/expansionary, -1 if higher = contractionary
//            (vacancy, rates, cap rate, DOM, delinquency, supply metrics)
//   norm     the baseline that separates "above" from "below". Seeded from
//            long-run averages in the Cignal database (see basis).
//   basis    how to derive the metric from a v_indicator_analytics row:
//              "value"   -> row.value (rates, levels, indexes already in units)
//              "yoy"     -> row.yoy_change (index series whose YoY is the metric,
//                           e.g. CPI -> inflation rate)
//              "yoyPct"  -> yoy_change / (value - yoy_change) * 100 (level series
//                           where the % change is the metric, e.g. rent, jobs)
//
// Phase is derived mechanically: polarity-adjusted level-vs-norm sets above/below,
// quarter-over-quarter direction sets rising/falling. Below+Rising = Recovery,
// Above+Rising = Expansion, Above+Falling = Hypersupply, Below+Falling = Contraction.

export const CYCLE_CALIBRATION = [
  // leading
  { slug: "treasury_10y",       label: "10-Year Treasury",     cls: "leading",    polarity: -1, norm: 5.8,  basis: "value",  unit: "%" },
  { slug: "consumer_sentiment", label: "Consumer Sentiment",   cls: "leading",    polarity: 1,  norm: 84.5, basis: "value",  unit: "idx" },
  { slug: "permits_5plus",      label: "MF Permits",           cls: "leading",    polarity: -1, norm: 407,  basis: "value",  unit: "K" },
  { slug: "mf_starts",          label: "MF Starts",            cls: "leading",    polarity: -1, norm: 368,  basis: "value",  unit: "K" },
  { slug: "days_on_market",     label: "Days on Market",       cls: "leading",    polarity: -1, norm: 57,   basis: "value",  unit: "days" },
  // coincident
  { slug: "gdp",                label: "GDP",                  cls: "coincident", polarity: 1,  norm: 3.2,  basis: "value",  unit: "%" },
  { slug: "real_pce",           label: "Real PCE",             cls: "coincident", polarity: 1,  norm: 2.5,  basis: "yoyPct", unit: "% YoY" },
  { slug: "employment",         label: "Job Growth",           cls: "coincident", polarity: 1,  norm: 1.6,  basis: "yoyPct", unit: "% YoY" },
  { slug: "zori_national",      label: "Rent Growth",          cls: "coincident", polarity: 1,  norm: 4.6,  basis: "yoyPct", unit: "% YoY" },
  { slug: "absorption",         label: "Absorption",           cls: "coincident", polarity: 1,  norm: 55,   basis: "value",  unit: "" },
  // trailing
  { slug: "unemployment",       label: "Unemployment",         cls: "trailing",   polarity: -1, norm: 5.7,  basis: "value",  unit: "%" },
  { slug: "cpi_headline",       label: "CPI Inflation",        cls: "trailing",   polarity: -1, norm: 3.9,  basis: "yoy",    unit: "% YoY" },
  { slug: "rental_vacancy",     label: "Vacancy",              cls: "trailing",   polarity: -1, norm: 7.3,  basis: "value",  unit: "%" },
  { slug: "cap_rate",           label: "Cap Rate",             cls: "trailing",   polarity: -1, norm: 5.5,  basis: "value",  unit: "%" },
  { slug: "fnma_mf_delinquency",label: "Delinquencies",        cls: "trailing",   polarity: -1, norm: 0.7,  basis: "value",  unit: "%" },
];

// Metric from a v_indicator_analytics row given a basis.
export function metricFromRow(row, basis) {
  if (!row) return null;
  const v = Number(row.value);
  const y = Number(row.yoy_change);
  if (basis === "yoy") return Number.isFinite(y) ? y : null;
  if (basis === "yoyPct") {
    const prior = v - y;
    return Number.isFinite(y) && Number.isFinite(prior) && prior !== 0 ? (y / Math.abs(prior)) * 100 : null;
  }
  return Number.isFinite(v) ? v : null;
}

// Phase from polarity-adjusted level vs norm + direction.
export function phaseOf(metric, norm, polarity, dir) {
  const above = polarity * (metric - norm) >= 0;
  const rising = polarity * dir >= 0;
  if (above) return rising ? "expansion" : "hypersupply";
  return rising ? "recovery" : "contraction";
}
