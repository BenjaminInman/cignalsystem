// ============================================================================
//  MARKET READ — SIGNAL THRESHOLD ENGINE  (the "Where Are We" cycle vote)
// ----------------------------------------------------------------------------
//  Each indicator produces TWO readings from the same underlying level+momentum:
//    1. sentiment  -> "g" | "a" | "r"  (green / neutral / red) — feeds the
//                     center tally.
//    2. phase       -> "recovery" | "expansion" | "hypersupply" | "contraction"
//                     — which quadrant the signal lights in on the wheel.
//
//  The four-phase logic follows the Econiq cycle: Recovery -> Expansion ->
//  Hypersupply -> Contraction, read off the classic level x direction grid:
//
//                          IMPROVING (momentum +)     WEAKENING (momentum -)
//    HEALTHY LEVEL         Expansion                  Hypersupply
//    STRESSED LEVEL        Recovery                   Contraction
//
//  >>> FIRST-PASS CALIBRATION <<<  Every threshold below is a placeholder for
//  Benjamin to tune against the curriculum's Signal Threshold. Nothing here is
//  doctrine — it is a working default so the wheel renders honestly today. The
//  DEADBAND constants create the "neutral" zone so small wiggles don't flip a
//  vote. Adjust freely; the API and component read whatever this returns.
// ============================================================================

// Level thresholds that separate a "healthy" from a "stressed" reading.
export const LEVELS = {
  vacancy: 7.0,        // % — below is tight/healthy, above is loose/stressed
  unemployment: 4.5,   // % — below is healthy labor market
  rates_10y: 4.25,     // % — 10Y level above which financing is a headwind
  inflation: 3.0,      // % YoY — shelter CPI above target-ish
};

// Deadbands: how big a move must be before it counts as improving/weakening
// (for momentum) or before sentiment leaves neutral.
export const DEADBAND = {
  growth_mom: 0.3,     // YoY% acceleration/deceleration (pp) to count as a move
  rate_mom: 0.15,      // level change (pp) to count as rising/falling
  growth_pos: 0.5,     // YoY% above which growth reads green
  growth_neg: -0.5,    // YoY% below which growth reads red
};

// Level-based COLOR bands (sentiment only — phase logic is separate). For a
// lower-is-better level: value < greenBelow -> green, > redAbove -> red, else
// amber. Calibration anchors from Benjamin: vacancy 8.3% -> amber, jobless
// 2.9% -> green.
export const COLOR = {
  vacancy: { greenBelow: 7.0, redAbove: 10.0 },
  unemployment: { greenBelow: 4.5, redAbove: 6.0 },
};

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// ---- helpers to derive current metric + momentum from a series of rows ------
// rows: [{ obs_date, value, yoy_change }] newest first.

// YoY percent for a growth-style series, plus whether that YoY% is
// accelerating vs the reading `lag` steps earlier.
function growthReading(rows, lag = 3) {
  if (!rows?.length) return null;
  const pct = (r) => {
    if (r.yoy_change == null) return null;
    const prior = Number(r.value) - Number(r.yoy_change);
    return prior && prior !== 0 ? (Number(r.yoy_change) / prior) * 100 : null;
  };
  const cur = pct(rows[0]);
  if (cur == null || !Number.isFinite(cur)) return null;
  const back = rows[Math.min(lag, rows.length - 1)];
  const prevPct = back ? pct(back) : null;
  const accel = prevPct == null ? 0 : cur - prevPct; // + = accelerating
  return { metric: cur, momentum: accel, unit: "%" };
}

// Level reading (vacancy, unemployment, rates) + direction vs `lag` back.
function levelReading(rows, lag = 3) {
  if (!rows?.length) return null;
  const cur = Number(rows[0].value);
  if (!Number.isFinite(cur)) return null;
  const back = rows[Math.min(lag, rows.length - 1)];
  const change = back ? cur - Number(back.value) : 0; // + = rising
  return { metric: cur, momentum: change, unit: "%" };
}

// ---- per-kind scoring --------------------------------------------------------

// Growth-style, higher-is-better (rent, jobs, wages, PCE).
function scoreGrowth(r) {
  const { metric: g, momentum: m } = r;
  const improving = m > DEADBAND.growth_mom;
  const weakening = m < -DEADBAND.growth_mom;
  const healthy = g >= 0; // positive growth = healthy side of the grid
  let phase;
  if (healthy) phase = weakening ? "hypersupply" : "expansion";
  else phase = improving ? "recovery" : "contraction";
  let sentiment;
  if (g > DEADBAND.growth_pos && !weakening) sentiment = "g";
  else if (g < DEADBAND.growth_neg && !improving) sentiment = "r";
  else sentiment = "a";
  return { phase, sentiment };
}

// Level-style, lower-is-better (vacancy, unemployment). Phase from momentum,
// but COLOR is level-based: where the value sits in its healthy/caution/stress
// band, not merely whether it moved.
function scoreStress(r, level, band) {
  const { metric: v, momentum: m } = r;
  const rising = m > DEADBAND.rate_mom;
  const falling = m < -DEADBAND.rate_mom;
  const healthy = v <= level;
  let phase;
  if (healthy) phase = rising ? "hypersupply" : "expansion";
  else phase = falling ? "recovery" : "contraction";
  let sentiment = "a";
  if (band) {
    if (v < band.greenBelow) sentiment = "g";
    else if (v > band.redAbove) sentiment = "r";
    else sentiment = "a";
  } else {
    sentiment = falling ? "g" : rising ? "r" : "a";
  }
  return { phase, sentiment };
}

// Wages: same phase read as other growth signals, but COLOR is sign-based —
// any positive wage growth reads green (Benjamin's calibration).
function scoreWages(r) {
  const { phase } = scoreGrowth(r);
  const g = r.metric;
  const sentiment = g > 0 ? "g" : g < 0 ? "r" : "a";
  return { phase, sentiment };
}

// 10-Year Treasury: financing-cost lens. Falling rates ease the cycle.
function scoreRates(r) {
  const { metric: v, momentum: m } = r;
  const rising = m > DEADBAND.rate_mom;
  const falling = m < -DEADBAND.rate_mom;
  const high = v >= LEVELS.rates_10y;
  let phase;
  if (high) phase = rising ? "contraction" : "hypersupply";
  else phase = falling ? "recovery" : "expansion";
  const sentiment = falling ? "g" : rising ? "r" : "a";
  return { phase, sentiment };
}

// Shelter CPI: inflation lens. At/below target supports expansion; hot +
// rising is late-cycle overheating; disinflation off a high is a cooldown.
function scoreInflation(r) {
  const { metric: v, momentum: m } = r; // m here = YoY% acceleration
  const rising = m > DEADBAND.growth_mom;
  const hot = v >= LEVELS.inflation;
  let phase;
  if (hot) phase = rising ? "hypersupply" : "contraction";
  else phase = rising ? "recovery" : "expansion";
  let sentiment;
  if (v <= 2.5) sentiment = "g";
  else if (v <= 4) sentiment = "a";
  else sentiment = "r";
  return { phase, sentiment };
}

// County GDP: annual, ~2yr lag — structural backdrop, not a live signal.
// Sign-based only; carries reduced weight in the tally.
function scoreStructural(r) {
  const g = r.metric;
  const phase = g >= 0 ? "expansion" : "contraction";
  const sentiment = g > DEADBAND.growth_pos ? "g" : g < DEADBAND.growth_neg ? "r" : "a";
  return { phase, sentiment };
}

// Registry: kind -> { reader, scorer, level? }
const KINDS = {
  rent: { read: growthReading, score: scoreGrowth },
  jobs: { read: growthReading, score: scoreGrowth },
  wages: { read: growthReading, score: scoreWages },
  pce: { read: growthReading, score: scoreGrowth },
  vacancy: { read: levelReading, score: (r) => scoreStress(r, LEVELS.vacancy, COLOR.vacancy) },
  unemployment: { read: levelReading, score: (r) => scoreStress(r, LEVELS.unemployment, COLOR.unemployment) },
  rates: { read: levelReading, score: scoreRates },
  inflation: { read: growthReading, score: scoreInflation },
  gdp: { read: growthReading, score: scoreStructural },
};

const PHASES = ["recovery", "expansion", "hypersupply", "contraction"];

// Public: score one indicator's rows for a given kind. Returns the display
// packet the API sends to the wheel, or null when there's no usable data.
export function scoreSignal({ kind, rows, weight = 1 }) {
  const spec = KINDS[kind];
  if (!spec) return null;
  const reading = spec.read(rows);
  if (!reading) return null;
  const { phase, sentiment } = spec.score(reading);
  const trend = (rows || [])
    .slice(0, 8)
    .reverse()
    .map((x) => Number(x.value))
    .filter((x) => Number.isFinite(x));
  return {
    metric: Math.round(reading.metric * 10) / 10,
    momentum: Math.round(reading.momentum * 100) / 100,
    unit: reading.unit,
    phase,
    sentiment,
    weight,
    trend,
    asOf: rows[0]?.obs_date || null,
  };
}

// Roll individual signal packets into the center tally + phase weighting.
export function summarize(signals) {
  const live = signals.filter((s) => s && !s.pending);
  const tally = { green: 0, neutral: 0, red: 0, total: live.length };
  const phaseWeight = { recovery: 0, expansion: 0, hypersupply: 0, contraction: 0 };
  for (const s of live) {
    if (s.sentiment === "g") tally.green++;
    else if (s.sentiment === "r") tally.red++;
    else tally.neutral++;
    phaseWeight[s.phase] += s.weight || 1;
  }
  let lead = null;
  let best = -1;
  for (const p of PHASES) {
    if (phaseWeight[p] > best) {
      best = phaseWeight[p];
      lead = p;
    }
  }
  // Only surface a lead phase if signals actually cluster (balance, not a call).
  const totalW = PHASES.reduce((a, p) => a + phaseWeight[p], 0) || 1;
  const concentration = best / totalW;
  return { tally, phaseWeight, lead, concentration: Math.round(concentration * 100) / 100 };
}

export const PHASE_ORDER = PHASES;
