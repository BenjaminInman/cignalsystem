// Cignal interactive underwriter — deal model + returns + Sell-vs-Refi.
// Pure functions; mirrors the v3 spreadsheet's Exit Strategy logic.

export function irr(cf, lo = -0.9, hi = 5) {
  const npv = (r) => cf.reduce((s, c, i) => s + c / Math.pow(1 + r, i), 0);
  if (npv(lo) * npv(hi) > 0) return null; // no sign change
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2, v = npv(mid);
    if (Math.abs(v) < 1e-6) return mid;
    (npv(lo) * v < 0) ? (hi = mid) : (lo = mid);
  }
  return (lo + hi) / 2;
}

const pmt = (rate, nper, pv) => (rate === 0 ? pv / nper : (pv * rate) / (1 - Math.pow(1 + rate, -nper)));

// Build annual pro forma from deal inputs + market-read forward assumptions.
export function buildProForma(d, fa) {
  const years = Math.max(d.holdYear, d.sellYear) + 1; // +1 for forward exit NOI
  const rentGrowth = (y) => (y <= 1 ? fa.rentGrowthY1 : y === 2 ? fa.rentGrowthY2 : fa.rentGrowthSubsequent);
  const vac = fa.stabilizedVacancy;
  const gpr1 = d.units * d.avgRent * 12;
  const oi1 = d.units * (d.otherIncomePerUnit || 0) * 12;
  const egi1 = gpr1 * (1 - vac) + oi1;
  const opex1 = egi1 * d.expenseRatio;

  const noi = [0]; let gpr = gpr1, oi = oi1, opex = opex1;
  for (let y = 1; y <= years; y++) {
    if (y > 1) { const g = 1 + rentGrowth(y); gpr *= g; oi *= g; opex *= 1 + d.expenseGrowth; }
    const egi = gpr * (1 - vac) + oi;
    noi[y] = egi - opex;
  }
  const price = d.price || noi[1] / d.goingInCap;
  const loan = price * d.ltv;
  const equity = price - loan + price * (d.closingPct || 0);
  const ioYears = Math.round((d.ioMonths || 0) / 12);
  const ds = (y) => (y <= ioYears ? loan * d.rate : pmt(d.rate / 12, d.amortYears * 12, loan) * 12);
  // loan balance EOY (IO holds balance; then amortizes)
  const bal = [loan]; let b = loan;
  for (let y = 1; y <= years; y++) {
    if (y <= ioYears) bal[y] = loan;
    else { const mDS = pmt(d.rate / 12, d.amortYears * 12, loan); let bb = bal[y - 1];
      for (let m = 0; m < 12; m++) bb -= (mDS - bb * (d.rate / 12)); bal[y] = Math.max(0, bb); }
  }
  return { noi, price, loan, equity, ds, bal, ioYears, goingInCap: noi[1] / price };
}


// Tiered LP-IRR-hurdle waterfall with GP promote (accrual method).
// tiers: [{ rate: upperLpIrrBound, lpShare }], last tier rate = Infinity.
export function waterfall(dealCf, lpEquity, gpEquity, tiers) {
  const n = dealCf.length;
  const lp = [-lpEquity], gp = [-gpEquity];
  let CLP = 0;
  for (let t = 1; t < n; t++) {
    let D = Math.max(0, dealCf[t] || 0); let lpT = 0, gpT = 0;
    for (const tier of tiers) {
      if (D <= 1e-9) break;
      const HB = tier.rate === Infinity ? Infinity : lpEquity * Math.pow(1 + tier.rate, t);
      const lpRoom = HB - CLP;
      if (lpRoom <= 0) continue;
      const totalForTier = tier.rate === Infinity ? D : lpRoom / tier.lpShare;
      const take = Math.min(D, totalForTier);
      lpT += take * tier.lpShare; gpT += take * (1 - tier.lpShare);
      CLP += take * tier.lpShare; D -= take;
    }
    lp[t] = lpT; gp[t] = gpT;
  }
  const sum = (a) => a.slice(1).reduce((s, x) => s + x, 0);
  return {
    lp: { irr: irr(lp), em: sum(lp) / lpEquity, profit: sum(lp) - lpEquity },
    gp: { irr: irr(gp), em: sum(gp) / gpEquity, profit: sum(gp) - gpEquity },
  };
}

export const DEFAULT_TIERS = [
  { rate: 0.08, lpShare: 0.90 },
  { rate: 0.10, lpShare: 0.75 },
  { rate: 0.12, lpShare: 0.70 },
  { rate: Infinity, lpShare: 0.65 },
];

// Two exit paths + cycle recommendation. `signals` from the market read drive the call.
export function exitStrategy(p, d, fa, signals) {
  const netSaleAt = (yr, cap) => (p.noi[yr + 1] / cap) * (1 - d.saleCost) - p.bal[yr];
  // Path A — sell at hold
  const A = [-p.equity];
  for (let y = 1; y <= d.holdYear; y++) A[y] = p.noi[y] - p.ds(y) + (y === d.holdYear ? netSaleAt(d.holdYear, fa.exitCapRate) : 0);
  // Path B — refi at refiYear, sell at sellYear
  const impVal = p.noi[d.refiYear + 1] / d.refiCap;
  const newLoan = d.refiLTV * impVal;
  const cashOut = newLoan - p.bal[d.refiYear] - newLoan * d.refiCost;
  const newDS = newLoan * d.refiRate; // interest-only refi
  const B = [-p.equity];
  for (let y = 1; y <= d.sellYear; y++) {
    const op = y <= d.refiYear ? p.noi[y] - p.ds(y) : p.noi[y] - newDS;
    B[y] = op + (y === d.refiYear ? cashOut : 0) + (y === d.sellYear ? (p.noi[d.sellYear + 1] / d.exitCapB) * (1 - d.saleCost) - newLoan : 0);
  }
  const sum = (a) => a.slice(1).reduce((s, x) => s + x, 0);
  const pathA = { irr: irr(A), em: sum(A) / p.equity, profit: sum(A) - p.equity, cf: A };
  const pathB = { irr: irr(B), em: sum(B) / p.equity, profit: sum(B) - p.equity, cf: B, cashOut };

  // Investor-level split (LP/GP) for each path
  const tiers = d.tiers || DEFAULT_TIERS;
  const lpShareEq = d.lpEquityShare == null ? 0.90 : d.lpEquityShare;
  const lpEq = p.equity * lpShareEq, gpEq = p.equity * (1 - lpShareEq);
  pathA.split = waterfall(A, lpEq, gpEq, tiers);
  pathB.split = waterfall(B, lpEq, gpEq, tiers);

  // Cycle recommendation from momentum signals
  const { momY1, momY2, demand } = signals;
  let rec, why;
  if (momY1 < 0 && momY2 > 0) { rec = "REFINANCE & HOLD"; why = "Soft now, recovery ahead — extend the hold to capture the up-leg; refinance to return capital while you wait."; }
  else if (demand > 0.35 && signals.supplyY1 > 0.4) { rec = "SELL INTO STRENGTH"; why = "Strong now but supply is building — exit into strength before the softening."; }
  else if (momY1 < -0.15 && momY2 < 0) { rec = "SELL / DE-RISK"; why = "Weak and not yet turning — de-risk; don’t extend into prolonged softness."; }
  else { rec = "NEUTRAL"; why = "No strong cycle signal — let the deal math decide."; }
  const mathFavors = pathB.irr > pathA.irr ? "Path B — Refi & Hold" : "Path A — Sell";
  const aligned = (pathB.irr > pathA.irr && rec.startsWith("REF")) || (pathB.irr <= pathA.irr && rec.startsWith("SEL"));
  return { pathA, pathB, rec, why, mathFavors, aligned };
}
