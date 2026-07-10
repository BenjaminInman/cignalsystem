// Trajectory — separating where a metric IS from where it is GOING.
//
// A single YoY print collapses two different facts into one number. Austin's rent
// is -3.4% (bad level) but has climbed from -5.2% over 24 months (good direction).
// Columbus is +0.6% (good level) but has fallen from +1.9% (bad direction). Ranking
// on level alone puts those two in the wrong order. Peeling back the onion means
// reading both.
//
// Method: ordinary-least-squares slope of the metric's own YoY history over a
// trailing window, expressed in points-per-year, plus a self-relative z-score
// (current reading against its own trailing mean and standard deviation).
//
// This is a TIME-SERIES read, deliberately distinct from the cross-sectional
// z-scores used on the divergence board. Cross-sectional answers "how does this
// market compare to its peers right now"; trajectory answers "how does this market
// compare to its own past". Both are needed; neither substitutes for the other.
//
// Leading and lagging series are never mixed here — trajectory is computed per
// indicator and stays attributed to that indicator.

export const TRAJ_WINDOW = 24; // months
const MIN_POINTS = 12;

// Slope smaller than this (in points per year) is treated as flat rather than a
// direction. Chosen so month-to-month noise in a smoothed YoY series does not get
// read as a trend; roughly a tenth of a point of YoY change per year.
export const FLAT_BAND = 0.15;

function olsSlope(values) {
  const n = values.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2;
  const my = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - mx) * (values[i] - my);
    den += (i - mx) * (i - mx);
  }
  return den ? num / den : 0; // per month
}

function stdev(values) {
  const n = values.length;
  if (n < 2) return 0;
  const m = values.reduce((a, b) => a + b, 0) / n;
  return Math.sqrt(values.reduce((a, b) => a + (b - m) * (b - m), 0) / n);
}

/**
 * @param {number[]} yoySeries  ascending YoY readings (oldest -> newest)
 * @param {object}   opts
 * @param {boolean}  opts.goodUp  true when a higher reading is better
 * @param {number}   opts.window  trailing months to fit (default 24)
 * @returns {null|{now,then,delta,slopePerYear,selfZ,direction,levelGood,state,label,note}}
 */
export function trajectory(yoySeries, { goodUp = true, window = TRAJ_WINDOW } = {}) {
  const s = (yoySeries || []).filter((v) => Number.isFinite(v));
  if (s.length < MIN_POINTS) return null;

  const win = s.slice(-window);
  const now = win[win.length - 1];
  const then = win[0];
  const slopePerYear = olsSlope(win) * 12;
  const sd = stdev(win);
  const mean = win.reduce((a, b) => a + b, 0) / win.length;
  const selfZ = sd ? (now - mean) / sd : 0;

  // Orient by polarity: "improving" means moving the way this metric should move.
  const oriented = goodUp ? slopePerYear : -slopePerYear;
  const direction = oriented > FLAT_BAND ? "improving" : oriented < -FLAT_BAND ? "deteriorating" : "flat";
  const levelGood = goodUp ? now >= 0 : now <= 0;

  let state, label, note;
  if (direction === "flat") {
    state = levelGood ? "holding" : "stalled";
    label = levelGood ? "Holding" : "Stalled";
    note = "Level is steady; no meaningful direction over the window.";
  } else if (levelGood && direction === "improving") {
    state = "strong_building";
    label = "Strong & building";
    note = "Healthy level, and still improving.";
  } else if (levelGood && direction === "deteriorating") {
    state = "strong_rolling_over";
    label = "Strong but rolling over";
    note = "Looks healthy today, but the trend has been turning down. The level lags the direction.";
  } else if (!levelGood && direction === "improving") {
    state = "weak_healing";
    label = "Weak but healing";
    note = "Still negative, but the trend has been recovering. Often the better forward setup.";
  } else {
    state = "weak_worsening";
    label = "Weak & worsening";
    note = "Negative and still moving the wrong way.";
  }

  return {
    now: round(now), then: round(then), delta: round(now - then),
    slopePerYear: round(slopePerYear), selfZ: round(selfZ, 2),
    months: win.length, direction, levelGood, state, label, note,
  };
}

function round(v, dp = 1) {
  const f = Math.pow(10, dp);
  return Math.round(v * f) / f;
}

// Tone for a trajectory badge: direction dominates the level, because the whole
// point of the badge is to surface direction that the level is hiding.
export function trajTone(t) {
  if (!t) return "neutral";
  if (t.state === "strong_building") return "bull";
  if (t.state === "weak_worsening") return "bear";
  if (t.state === "strong_rolling_over") return "bear";
  if (t.state === "weak_healing") return "bull";
  return "neutral";
}
