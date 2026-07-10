// Trajectory — separating where a metric IS from where it is GOING,
// and reading the direction in 12-month segments rather than one long fit.
//
// A single YoY print collapses level and direction into one number. Austin's rent is
// -3.4% (bad level) but has climbed from -5.4% (good direction). Columbus is +0.6%
// (good level) but has fallen from +2.5% (bad direction). Ranking on level alone
// puts those two in the wrong order.
//
// But a single 24-month fit hides a second, worse failure: a market that improved
// for a year and then rolled over averages out to "improving". Empirically that is
// not an edge case — 11 of the 19 tracked metros reversed direction mid-window.
// Tampa ran -1.1% -> +2.2% -> -2.8%; its 24-month slope (-1.47pp/yr) badly
// understates a -6.89pp/yr collapse in the last twelve months. Atlanta's 24-month
// slope reads +1.82pp/yr while its recent twelve months run -0.79pp/yr.
//
// So: fit each 12-month segment separately. The MOST RECENT segment sets the
// direction and the state; the prior segment supplies momentum (accelerating,
// decelerating, or a reversal). The full-window slope is kept for context only —
// it must never be the thing a state is named from.
//
// This is a TIME-SERIES read, deliberately distinct from the cross-sectional
// z-scores on the divergence board. Cross-sectional answers "how does this market
// compare to its peers right now"; trajectory answers "how does this market compare
// to its own past". Both are needed; neither substitutes for the other. Leading and
// lagging series are never mixed — trajectory is computed per indicator and stays
// attributed to that indicator.

export const SEGMENT = 12;          // months per segment
export const TRAJ_WINDOW = 24;      // total lookback
const MIN_SEGMENT = 8;              // a segment shorter than this is not fit

// Slope smaller than this (points per year) is noise, not a direction.
export const FLAT_BAND = 0.15;

function olsSlopePerYear(values) {
  const n = values.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2;
  const my = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - mx) * (values[i] - my);
    den += (i - mx) * (i - mx);
  }
  return den ? (num / den) * 12 : 0;
}

const round = (v, dp = 1) => { const f = 10 ** dp; return Math.round(v * f) / f; };
const dirOf = (orientedSlope) =>
  orientedSlope > FLAT_BAND ? "improving" : orientedSlope < -FLAT_BAND ? "deteriorating" : "flat";

/**
 * @param {number[]} yoySeries ascending YoY readings (oldest -> newest)
 * @param {object} opts
 * @param {boolean} opts.goodUp  true when a higher reading is better
 * @param {number}  opts.window  total months to read (default 24)
 */
export function trajectory(yoySeries, { goodUp = true, window = TRAJ_WINDOW } = {}) {
  const s = (yoySeries || []).filter((v) => Number.isFinite(v));
  if (s.length < MIN_SEGMENT + 1) return null;

  const win = s.slice(-window);
  const now = win[win.length - 1];

  // Split into consecutive 12-month segments, oldest first. A trailing partial
  // segment shorter than MIN_SEGMENT is dropped rather than fit on thin data.
  const segments = [];
  for (let end = win.length; end > 0; end -= SEGMENT) {
    const start = Math.max(0, end - SEGMENT);
    const chunk = win.slice(start, end);
    if (chunk.length < MIN_SEGMENT) break;
    const oriented = goodUp ? olsSlopePerYear(chunk) : -olsSlopePerYear(chunk);
    segments.unshift({
      months: chunk.length,
      from: round(chunk[0]),
      to: round(chunk[chunk.length - 1]),
      change: round(chunk[chunk.length - 1] - chunk[0]),
      slopePerYear: round(goodUp ? olsSlopePerYear(chunk) : olsSlopePerYear(chunk), 2),
      orientedSlope: round(oriented, 2),
      direction: dirOf(oriented),
    });
  }
  if (!segments.length) return null;

  const recent = segments[segments.length - 1];
  const prior = segments.length > 1 ? segments[segments.length - 2] : null;

  // Direction and state come from the MOST RECENT segment. This is the whole point:
  // a market that healed last year and is rolling over now must not read "healing".
  const direction = recent.direction;
  const levelGood = goodUp ? now >= 0 : now <= 0;

  // Momentum compares the last two segments.
  let momentum = null, momentumNote = "";
  if (prior) {
    const r = recent.orientedSlope, p = prior.orientedSlope;
    const sameSign = (r > 0 && p > 0) || (r < 0 && p < 0);
    if (!sameSign && (Math.abs(r) > FLAT_BAND && Math.abs(p) > FLAT_BAND)) {
      momentum = "reversal";
      momentumNote = r > 0
        ? "Reversed: it was deteriorating a year ago and is improving now."
        : "Reversed: it was improving a year ago and is deteriorating now.";
    } else if (sameSign && Math.abs(r) > Math.abs(p)) {
      momentum = "accelerating";
      momentumNote = r > 0 ? "The improvement is speeding up." : "The decline is speeding up.";
    } else if (sameSign) {
      momentum = "decelerating";
      momentumNote = r > 0 ? "Still improving, but more slowly." : "Still declining, but more slowly.";
    } else {
      momentum = "steady";
      momentumNote = "";
    }
  }

  let state, label, note;
  if (direction === "flat") {
    state = levelGood ? "holding" : "stalled";
    label = levelGood ? "Holding" : "Stalled";
    note = "No meaningful direction over the last twelve months.";
  } else if (levelGood && direction === "improving") {
    state = "strong_building"; label = "Strong & building";
    note = "Healthy level, and still improving over the last twelve months.";
  } else if (levelGood && direction === "deteriorating") {
    state = "strong_rolling_over"; label = "Strong but rolling over";
    note = "Looks healthy today, but has been turning down for the last twelve months. The level lags the direction.";
  } else if (!levelGood && direction === "improving") {
    state = "weak_healing"; label = "Weak but healing";
    note = "Still negative, but recovering over the last twelve months. Often the better forward setup.";
  } else {
    state = "weak_worsening"; label = "Weak & worsening";
    note = "Negative and still moving the wrong way.";
  }
  if (momentumNote) note += ` ${momentumNote}`;

  return {
    now: round(now),
    then: round(win[0]),
    delta: round(now - win[0]),
    months: win.length,
    segments,                                   // oldest -> newest, one per 12 months
    recentSlope: recent.orientedSlope,
    priorSlope: prior ? prior.orientedSlope : null,
    fullWindowSlope: round(goodUp ? olsSlopePerYear(win) : -olsSlopePerYear(win), 2), // context only
    inflection: momentum === "reversal",
    momentum, direction, levelGood, state, label, note,
  };
}

// Tone for a trajectory badge: direction dominates level, because the badge exists
// to surface the direction the level is hiding.
export function trajTone(t) {
  if (!t) return "neutral";
  if (t.state === "strong_building" || t.state === "weak_healing") return "bull";
  if (t.state === "weak_worsening" || t.state === "strong_rolling_over") return "bear";
  return "neutral";
}
