// Cignal Underwriting — Market Read engine
// Single source of truth for forward assumptions. Mirrors the spreadsheet
// (Cignal Market Read tab) formula-for-formula. Calibrated 2026-08 (see Calibration tab).
export const ENGINE_METHOD_VERSION = "2026.08-msapanel-v2";

export const COEFFICIENTS = {
  // Recalibrated on an MSA panel (122 metros, 2015-2026, metro fixed effects).
  kRent: 0.065,          // rent~momentum; panel elasticities: vacancy -1.7, employment +0.53 (R2within 0.53)
  kVac: 0.010,           // supply->vacancy: panel estimate +0.21 pp per 1% of stock permitted (low R2; modest confidence)
  capBeta: 0.50,         // exit-cap sensitivity to 10Y change (literature-anchored; not in panel)
  phaseSens: 0.010,      // exit-cap sensitivity to exit-phase momentum
  capBuffer: 0.0035,     // underwriting conservatism buffer
  demandWeights: { emp: 0.45, rentMom: 0.35, absorption: 0.20 }, // employment up-weighted: strong local driver in the panel
};

const SCENARIO_DELTAS = {
  bear: { rent: -0.015, vac: 0.010, cap: 0.0035 },
  base: { rent: 0.0, vac: 0.0, cap: 0.0 },
  bull: { rent: 0.015, vac: -0.0075, cap: -0.0035 },
};

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/**
 * @param {object} i  market inputs (signals already normalized to [-1,1])
 *   trend, empSignal, rentMomSignal, absorptionSignal,
 *   supplyNearTerm, supplyDecay, currentVacancy, structuralVacancy,
 *   current10Y, projected10Y, goingInCap
 * @param {"bear"|"base"|"bull"} scenario
 */
export function runMarketRead(i, scenario = "base") {
  const C = COEFFICIENTS;
  const d = SCENARIO_DELTAS[scenario] ?? SCENARIO_DELTAS.base;
  const w = C.demandWeights;

  const demand =
    w.emp * i.empSignal + w.rentMom * i.rentMomSignal + w.absorption * i.absorptionSignal;
  const supplyY1 = i.supplyNearTerm;
  const supplyY2 = i.supplyNearTerm * (1 - i.supplyDecay);
  const momY1 = demand - supplyY1;
  const momY2 = demand - supplyY2;
  const momExit = demand - i.supplyNearTerm * 0.15;

  const rentY1 = i.trend + momY1 * C.kRent + d.rent;
  const rentY2 = i.trend + momY2 * C.kRent + d.rent;
  const rentSubseq = i.trend + d.rent;
  const vacancy = i.structuralVacancy + ((supplyY1 + supplyY2) / 2) * C.kVac + d.vac;
  const exitCap =
    i.goingInCap + (i.projected10Y - i.current10Y) * C.capBeta - momExit * C.phaseSens + C.capBuffer + d.cap;

  let phase;
  if (momY1 < 0 && momY2 > 0) phase = "Late Hypersupply → Recovery (turning up)";
  else if (momY1 < -0.15) phase = "Hypersupply / soft";
  else if (demand > 0.35) phase = "Expansion";
  else phase = "Recovery";

  return {
    scenario,
    engineMethodVersion: ENGINE_METHOD_VERSION,
    signals: { demand, supplyY1, supplyY2, momY1, momY2, momExit },
    forwardAssumptions: {
      rentGrowthY1: rentY1,
      rentGrowthY2: rentY2,
      rentGrowthSubsequent: rentSubseq,
      stabilizedVacancy: vacancy,
      exitCapRate: exitCap,
    },
    phase,
  };
}
