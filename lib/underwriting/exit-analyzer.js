// Exit Strategy Analyzer — existing-asset "sell now vs. refinance & hold" decision.
// Incremental-IRR framing: the equity you'd LEAVE IN by not selling is the capital at risk.
import { irr } from "./proforma.js";

export function analyzeExit(d, signals) {
  const currentValue = d.currentNOI / d.currentCap;
  const netSaleNow = currentValue * (1 - d.saleCost) - d.loanBalance;      // Path A: cash if you sell today
  const newLoan = d.refiLTV * currentValue;
  const cashOut = newLoan - d.loanBalance - newLoan * d.refiCost;          // cash pulled at refi
  const newDS = newLoan * d.refiRate;                                       // interest-only refi
  const capitalLeftIn = netSaleNow - cashOut;                              // equity kept in the deal by holding

  // forward NOI + cash flows while holding
  const noi = (y) => d.currentNOI * Math.pow(1 + d.noiGrowth, y);
  const cf = [-capitalLeftIn];
  for (let y = 1; y <= d.holdYears; y++) cf[y] = noi(y) - newDS;
  const valueS = noi(d.holdYears + 1) / d.exitCap;
  const netSaleS = valueS * (1 - d.saleCost) - newLoan;
  cf[d.holdYears] += netSaleS;

  const sum = (a) => a.slice(1).reduce((s, x) => s + x, 0);
  const holdIRR = irr(cf);
  const holdEM = capitalLeftIn > 0 ? sum(cf) / capitalLeftIn : null;
  const holdProfit = sum(cf) - capitalLeftIn;

  // cycle read
  const { momY1 = 0, momY2 = 0, demand = 0, supplyY1 = 0 } = signals || {};
  let rec, why;
  if (momY1 < 0 && momY2 > 0) { rec = "REFINANCE & HOLD"; why = "Soft now, recovery ahead — extend the hold to capture the up-leg; refinance to pull capital while you wait."; }
  else if (demand > 0.35 && supplyY1 > 0.4) { rec = "SELL INTO STRENGTH"; why = "Strong now but supply is building — exit into strength before the softening."; }
  else if (momY1 < -0.15 && momY2 < 0) { rec = "SELL / DE-RISK"; why = "Weak and not turning — take the proceeds; don't extend into prolonged softness."; }
  else { rec = "NEUTRAL"; why = "No strong cycle signal — let the numbers decide."; }

  const mathFavors = holdIRR != null && holdIRR >= d.reinvestHurdle ? "Refinance & Hold" : "Sell now";
  const aligned = (mathFavors.startsWith("Refi") && rec.startsWith("REF")) || (mathFavors.startsWith("Sell") && rec.startsWith("SEL"));

  return { currentValue, netSaleNow, newLoan, cashOut, newDS, capitalLeftIn, valueS, netSaleS,
           holdIRR, holdEM, holdProfit, rec, why, mathFavors, aligned, cf };
}
