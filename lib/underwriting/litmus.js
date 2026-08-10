// Litmus Test — market-agnostic quick-screen. Pure deal math, no cycle/warehouse.
export const DEFAULT_THRESHOLDS = { capMin: 0.055, dscrMin: 1.25, cocMin: 0.06, spreadMin: 0.015, yocMin: 0.065 };

const mortgageConstant = (rate, years = 30) => {
  const m = rate / 12, n = years * 12;
  return m === 0 ? 1 / years : (m / (1 - Math.pow(1 + m, -n))) * 12;
};

export function litmus(inp) {
  const t = { ...DEFAULT_THRESHOLDS, ...(inp.thresholds || {}) };
  const { units, price, avgRent, expenseRatio, vacancy, ltv, rate, valueAdd, rehabPerUnit = 0, stabilizedRent = 0 } = inp;
  const perUnit = units ? price / units : 0;

  // in-place
  const gpr = units * avgRent * 12;
  const noi = gpr * (1 - vacancy) * (1 - expenseRatio);
  const goingInCap = price ? noi / price : 0;
  const loan = price * ltv;
  const ds = loan * mortgageConstant(rate);
  const equity = price - loan;
  const cf = noi - ds;
  const dscr = ds ? noi / ds : 0;
  const coc = equity ? cf / equity : 0;

  let va = null;
  if (valueAdd) {
    const totalCost = price + rehabPerUnit * units;
    const sNoi = units * stabilizedRent * 12 * (1 - vacancy) * (1 - expenseRatio);
    const yoc = totalCost ? sNoi / totalCost : 0;
    const spread = yoc - goingInCap;
    const vaLoan = totalCost * ltv;
    const vaDs = vaLoan * mortgageConstant(rate);
    const vaEquity = totalCost - vaLoan;
    const sDscr = vaDs ? sNoi / vaDs : 0;
    const sCoc = vaEquity ? (sNoi - vaDs) / vaEquity : 0;
    va = { totalCost, sNoi, yoc, spread, sDscr, sCoc };
  }

  const checks = valueAdd
    ? [
        { key: "Development spread", v: va.spread, min: t.spreadMin, pass: va.spread >= t.spreadMin, fmt: "pct" },
        { key: "Yield-on-cost", v: va.yoc, min: t.yocMin, pass: va.yoc >= t.yocMin, fmt: "pct" },
        { key: "Stabilized DSCR", v: va.sDscr, min: t.dscrMin, pass: va.sDscr >= t.dscrMin, fmt: "x" },
      ]
    : [
        { key: "Going-in cap", v: goingInCap, min: t.capMin, pass: goingInCap >= t.capMin, fmt: "pct" },
        { key: "DSCR", v: dscr, min: t.dscrMin, pass: dscr >= t.dscrMin, fmt: "x" },
        { key: "Cash-on-cash", v: coc, min: t.cocMin, pass: coc >= t.cocMin, fmt: "pct" },
      ];

  return { perUnit, noi, goingInCap, dscr, coc, cf, equity, va, checks, verdict: checks.every((c) => c.pass) ? "PASS" : "FAIL" };
}
