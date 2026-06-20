// Cignal Score — Cycle Intelligence Assessment.
// Single source of truth for questions + scoring. Pure JS (no React), so the
// public page imports it for rendering and the API route imports it to score
// server-side (results can't be revealed without the email submit hitting the API).
//
// option: { label, score 0-4, bias? exuberance|fear|denial|desperation }
// dimension: positioning | literacy | discipline | timing | sourcing

export const QUESTIONS = [
  { dim: "positioning", q: "Beyond the local real estate cycle, which broader cycle exerts the most influence on multifamily over a decade-plus horizon?", options: [
    { label: "The seasonal leasing cycle", score: 0 },
    { label: "The political election cycle", score: 1 },
    { label: "The long-term debt cycle", score: 4 },
    { label: "The construction-cost cycle", score: 1 },
  ]},
  { dim: "positioning", q: "New supply is still delivering fast, occupancy has just begun slipping, and rent growth is decelerating but still positive. This combination most likely marks:", options: [
    { label: "The turn into hyper-supply — the cycle's most misread phase", score: 4 },
    { label: "Late expansion — fundamentals are strong, keep acquiring", score: 1, bias: "exuberance" },
    { label: "Early recovery — demand is about to accelerate", score: 0 },
    { label: "A recession already underway", score: 1 },
  ]},
  { dim: "positioning", q: "As a market approaches its peak, which of these typically moves first?", options: [
    { label: "Vacancy begins rising", score: 1 },
    { label: "Rents begin falling", score: 2 },
    { label: "Construction starts and permits roll over", score: 4 },
    { label: "Cap rates expand", score: 1 },
  ]},
  { dim: "positioning", q: "How would you defend the current cycle phase of your primary market?", options: [
    { label: "I don't track phase explicitly", score: 0 },
    { label: "By sentiment and recent deal flow", score: 1 },
    { label: "By current rents and occupancy", score: 2 },
    { label: "By the direction of leading indicators relative to trailing ones", score: 4 },
  ]},
  { dim: "literacy", q: "Which set contains only leading indicators for a multifamily market?", options: [
    { label: "Occupancy, effective rents, cap rates", score: 0 },
    { label: "Days on market, absorption, closed comparables", score: 1 },
    { label: "CPI rent, vacancy, foreclosure filings", score: 1 },
    { label: "Building permits, the yield curve, multifamily starts", score: 4 },
  ]},
  { dim: "literacy", q: "Over the past year, rents and interest rates rose together in your market. The most disciplined reading is:", options: [
    { label: "They're correlated here, likely driven by a common factor — don't assume causation", score: 4 },
    { label: "Higher rates are driving rents up — so push rents further", score: 0 },
    { label: "The correlation confirms you're in expansion", score: 1 },
    { label: "Rates don't matter to your rents — disregard them", score: 1 },
  ]},
  { dim: "literacy", q: "Your underwriting leans heavily on the trailing 12 months of submarket rent growth. The central risk is that this data:", options: [
    { label: "Is too volatile to rely on", score: 1 },
    { label: "Isn't granular enough for one submarket", score: 1 },
    { label: "Describes where the market has been, not where it's going", score: 4 },
    { label: "Overweights national conditions", score: 1 },
  ]},
  { dim: "literacy", q: "Cap rates in your market held flat while the 10-year Treasury rose 150 bps, compressing the spread. This most likely reflects:", options: [
    { label: "Buyers still pricing aggressive rent growth — froth that may correct", score: 4 },
    { label: "A healthy, stable market", score: 1 },
    { label: "That cap rates simply don't track rates", score: 0 },
    { label: "A clear, immediate buying opportunity", score: 1, bias: "exuberance" },
  ]},
  { dim: "discipline", q: "Your last three offers lost to bidders underwriting rent growth you consider unrealistic. The disciplined response is to:", options: [
    { label: "Match their assumptions to stay competitive", score: 0, bias: "exuberance" },
    { label: "Lower your return threshold across the board", score: 1, bias: "exuberance" },
    { label: "Hold your discipline and let those deals go", score: 4 },
    { label: "Exit the market until it cools off", score: 1, bias: "fear" },
  ]},
  { dim: "discipline", q: "Headlines turn sharply negative and transaction volume dries up. For a prepared operator, this phase most often represents:", options: [
    { label: "A time to preserve capital and wait for clarity", score: 2, bias: "fear" },
    { label: "Confirmation to exit before further declines", score: 0, bias: "desperation" },
    { label: "A dislocation that won't reach quality assets", score: 1, bias: "denial" },
    { label: "The window where the best cost basis is set", score: 4 },
  ]},
  { dim: "discipline", q: "A market you're bullish on just printed a sharp rise in permits and softening absorption. You:", options: [
    { label: "Trust the thesis — one quarter isn't a trend", score: 1, bias: "denial" },
    { label: "Assume the data is noisy and discount it", score: 0, bias: "denial" },
    { label: "Treat it as an early warning and re-test the thesis", score: 4 },
    { label: "Reverse your position immediately", score: 1 },
  ]},
  { dim: "discipline", q: "You're mid-hold as the market enters recession; your debt is fixed for four more years. The disciplined move is usually to:", options: [
    { label: "Sell now to avoid further paper losses", score: 0, bias: "desperation" },
    { label: "Operate through it — your timeline outlasts the phase", score: 4 },
    { label: "Halt all capital improvements to conserve cash", score: 2, bias: "fear" },
    { label: "Refinance immediately, whatever the terms", score: 0, bias: "desperation" },
  ]},
  { dim: "timing", q: "Two operators buy identical assets — one in early recovery, one at the peak. Over the full cycle, the gap in outcomes is explained mostly by:", options: [
    { label: "Entry timing relative to the cycle", score: 4 },
    { label: "Operational execution", score: 1 },
    { label: "Financing terms", score: 1 },
    { label: "Luck", score: 0 },
  ]},
  { dim: "timing", q: "Your acquisition pipeline is built primarily around:", options: [
    { label: "Deals that pencil at today's rates", score: 1 },
    { label: "Where the cycle is heading across your hold period", score: 4 },
    { label: "Whatever off-market flow brokers bring", score: 1 },
    { label: "The markets your peers are actively entering", score: 0, bias: "exuberance" },
  ]},
  { dim: "timing", q: "The strongest discipline in exit timing is to:", options: [
    { label: "Sell once you hit your target return, regardless of phase", score: 2 },
    { label: "Sell when sentiment peaks and buyers are most aggressive", score: 3 },
    { label: "Plan the exit around the cycle phase, decided at acquisition", score: 4 },
    { label: "Hold indefinitely and refinance when needed", score: 1 },
  ]},
  { dim: "sourcing", q: "The most reliable read on a submarket weighs:", options: [
    { label: "National headlines and gut feel", score: 0 },
    { label: "One trusted local broker's view", score: 1 },
    { label: "Macro, industry, and submarket signals together", score: 4 },
    { label: "Whichever data is easiest to pull", score: 0 },
  ]},
  { dim: "sourcing", q: "Reliable leading data is thinnest at the submarket level. The disciplined operator therefore:", options: [
    { label: "Substitutes national data as a proxy", score: 1 },
    { label: "Skips formal submarket analysis", score: 0 },
    { label: "Waits for better data to be published", score: 1 },
    { label: "Builds in local, on-the-ground inputs structurally — not occasionally", score: 4 },
  ]},
  { dim: "sourcing", q: "Your process for reviewing market indicators is:", options: [
    { label: "Ad hoc — when something feels off", score: 0 },
    { label: "An annual review", score: 1 },
    { label: "A consistent monthly-or-better cadence across a defined indicator set", score: 4 },
    { label: "Whenever a live deal requires it", score: 1 },
  ]},
];

export const MAX_RAW = QUESTIONS.length * 4;

export const DIMS = {
  positioning: "Cycle Positioning",
  literacy: "Indicator Literacy",
  discipline: "Behavioral Discipline",
  timing: "Decision Timing",
  sourcing: "Signal Sourcing",
};

export const BIAS_COPY = {
  exuberance: { name: "Irrational Exuberance", body: "You lean toward conviction when the market is hottest — the exact moment risk is highest. Cycle-aware operators read peak euphoria as a signal to tighten discipline, not chase it." },
  fear: { name: "Irrational Fear", body: "You tend to freeze when conditions sour — and the bottom of a cycle is precisely where the strongest entries are built. Hesitation here quietly costs more than a bad deal." },
  denial: { name: "Irrational Denial", body: "When data challenges your thesis, the instinct is to defend the thesis. The cycle doesn't negotiate — the operators who win update fast when the signals turn." },
  desperation: { name: "Irrational Desperation", body: "Under pressure you move reactively — selling into weakness or forcing action. Desperation locks in the cycle's worst prices. Position is set before the pressure arrives." },
};

export const TIERS = [
  { key: "recon", name: "Recon", cert: "ECF", price: "$997", line: "Learn to read the four phases and the signals that move them." },
  { key: "specialops", name: "Special Ops", cert: "ECCA", price: "$4,997", line: "Turn cycle reads into timing, underwriting, and discipline under pressure." },
  { key: "commander", name: "Commander", cert: "CMCS", price: "$9,997", line: "Operate ahead of the cycle with a full intelligence system." },
];

// tone maps to the site's tailwind color tokens: up | signal | down
export function band(score) {
  if (score >= 80) return { level: 4, label: "Cycle Commander", tone: "up" };
  if (score >= 60) return { level: 3, label: "Cycle Reader", tone: "signal" };
  if (score >= 40) return { level: 2, label: "Signal Aware", tone: "signal" };
  return { level: 1, label: "Blind Spot", tone: "down" };
}

export function bandBlurb(level) {
  return {
    1: "You're reading the market through trailing signals and instinct. The cycle is moving before you see it.",
    2: "You catch some signals, but inconsistently — and the costly moments are exactly the ones you miss.",
    3: "You read the cycle well. The gap now is discipline and timing under pressure.",
    4: "You operate ahead of the cycle. Few do. The work now is staying there.",
  }[level];
}

export function recommendedTierKey(level) {
  if (level >= 4) return "commander";
  if (level === 3) return "specialops";
  return "recon";
}

export function ascensionHeadline(level, score) {
  return {
    1: `You scored ${score}. Start at Recon — this is the exact gap it closes.`,
    2: `You scored ${score}. Recon turns scattered signals into a repeatable system.`,
    3: `You scored ${score}. You're past the basics — Special Ops sharpens timing and discipline.`,
    4: `You scored ${score}. Few reach this. Commander certification and the live dashboard keep you ahead.`,
  }[level];
}

function dimTone(pct) {
  if (pct >= 70) return "up";
  if (pct >= 40) return "signal";
  return "down";
}

// answers: object/array mapping question index -> chosen option index.
export function isValidAnswers(answers) {
  if (!answers || typeof answers !== "object") return false;
  for (let i = 0; i < QUESTIONS.length; i++) {
    const oi = answers[i];
    if (!Number.isInteger(oi) || oi < 0 || oi >= QUESTIONS[i].options.length) return false;
  }
  return true;
}

// Returns { score, band:{level,label,tone}, dominant_bias, dimension_scores:[{key,name,pct,tone}] }
export function computeResult(answers) {
  let raw = 0;
  const dimRaw = {}; const dimMax = {};
  Object.keys(DIMS).forEach((k) => { dimRaw[k] = 0; dimMax[k] = 0; });
  const biasTally = {};

  QUESTIONS.forEach((qq, i) => {
    dimMax[qq.dim] += 4;
    const oi = answers[i];
    if (!Number.isInteger(oi) || oi < 0 || oi >= qq.options.length) return;
    const opt = qq.options[oi];
    raw += opt.score;
    dimRaw[qq.dim] += opt.score;
    if (opt.bias) biasTally[opt.bias] = (biasTally[opt.bias] || 0) + 1;
  });

  const score = Math.round((raw / MAX_RAW) * 100);
  const dimension_scores = Object.keys(DIMS).map((k) => {
    const pct = dimMax[k] ? Math.round((dimRaw[k] / dimMax[k]) * 100) : 0;
    return { key: k, name: DIMS[k], pct, tone: dimTone(pct) };
  });

  let dominant_bias = null, max = 0;
  Object.entries(biasTally).forEach(([k, v]) => { if (v > max) { max = v; dominant_bias = k; } });

  return { score, band: band(score), dominant_bias, dimension_scores };
}
