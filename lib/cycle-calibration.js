// Cycle-wheel calibration — the single source of truth for how each indicator
// is placed on the four-phase cycle clock.
//
//   cls      leading | coincident | trailing  (which ring it sits on)
//   polarity +1 if higher = later/expansionary, -1 if higher = contractionary
//   norm     baseline separating "above" from "below". Seeded from TRAILING
//            ~20-YEAR averages of the series (in its displayed representation),
//            so the read reflects the current regime rather than deep history.
//   basis    "value" -> row.value; "yoy" -> row.yoy_change;
//            "yoyPct" -> yoy_change / (value - yoy_change) * 100
//
// Phase is derived: polarity-adjusted level-vs-norm sets above/below, QoQ
// direction sets rising/falling. Below+Rising=Recovery, Above+Rising=Expansion,
// Above+Falling=Hypersupply, Below+Falling=Contraction.

export const CYCLE_CALIBRATION = [
  // leading
  { slug: "treasury_10y",       label: "10-Year Treasury",     cls: "leading",    polarity: -1, norm: 2.89, basis: "value",  unit: "%" },
  { slug: "consumer_sentiment", label: "Consumer Sentiment",   cls: "leading",    polarity: 1,  norm: 77.8, basis: "value",  unit: "idx" },
  { slug: "permits_5plus",      label: "MF Permits",           cls: "leading",    polarity: -1, norm: 391,  basis: "value",  unit: "K" },
  { slug: "mf_starts",          label: "MF Starts",            cls: "leading",    polarity: -1, norm: 329,  basis: "value",  unit: "K" },
  { slug: "days_on_market",     label: "Days on Market (For Sale)", cls: "leading", polarity: -1, norm: 57,   basis: "value",  unit: "days" },
  { slug: "apt_time_on_market", label: "Days to Lease (Rental)",    cls: "leading", polarity: -1, norm: 28.6, basis: "value",  unit: "days" },
  // coincident
  { slug: "gdp",                label: "GDP",                  cls: "coincident", polarity: 1,  norm: 2.15, basis: "value",  unit: "%" },
  { slug: "real_pce",           label: "Real PCE",             cls: "coincident", polarity: 1,  norm: 2.2,  basis: "yoyPct", unit: "% YoY" },
  { slug: "employment",         label: "Job Growth",           cls: "coincident", polarity: 1,  norm: 0.83, basis: "yoyPct", unit: "% YoY" },
  { slug: "zori_national",      label: "Rent Growth",          cls: "coincident", polarity: 1,  norm: 4.81, basis: "yoyPct", unit: "% YoY" },
  { slug: "absorption",         label: "Absorption",           cls: "coincident", polarity: 1,  norm: 55,   basis: "value",  unit: "" },
  // trailing
  { slug: "unemployment",       label: "Unemployment",         cls: "trailing",   polarity: -1, norm: 5.78, basis: "value",  unit: "%" },
  { slug: "cpi_headline",       label: "CPI Inflation",        cls: "trailing",   polarity: -1, norm: 2.53, basis: "yoyPct", unit: "% YoY" },
  { slug: "rental_vacancy",     label: "Vacancy",              cls: "trailing",   polarity: -1, norm: 7.8,  basis: "value",  unit: "%" },
  { slug: "cap_rate",           label: "Cap Rate",             cls: "trailing",   polarity: -1, norm: 5.6,  basis: "value",  unit: "%" },
  { slug: "fnma_mf_delinquency",label: "Delinquencies",        cls: "trailing",   polarity: -1, norm: 0.69, basis: "value",  unit: "%" },
];

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

export function phaseOf(metric, norm, polarity, dir) {
  const above = polarity * (metric - norm) >= 0;
  const rising = polarity * dir >= 0;
  if (above) return rising ? "expansion" : "hypersupply";
  return rising ? "recovery" : "contraction";
}
