// Investor vertical content.
//
// This is a MARKETING RELABEL of the multifamily vertical, not a distinct data
// product: the ticker, indicators, signals, forecasts, market maps, portfolio,
// news, and every roster read the identical multifamily warehouse rows. The
// only override is COPY — the audience-facing positioning is framed for LP/GP
// investors instead of owner/operators. Everything not exported here falls back
// to lib/data.js via getContent(), so there is a single source of truth for the
// numbers and no risk of the two sites drifting.
//
// NOTE ON THE ASSET vs THE AUDIENCE: the asset is still multifamily real estate
// (that's what the data measures), so asset-descriptive lines keep "multifamily."
// What changes is the audience frame: investors deciding WHEN to deploy capital,
// not operators running a P&L.

export const COPY = {
  heroKicker: "Market Intelligence · Multifamily Investors",
  heroAsset: "multifamily real estate",
  heroLead:
    "The science of multifamily investing — market intelligence for the investors deciding when to deploy capital, which sponsors to back, and which markets are turning first.",
  whoHeadline: "Built for the investors who fund the multifamily cycle.",
  whoLead:
    "Cignal System is market intelligence for multifamily investors — it turns the economic data that moves rents, occupancy, and values into a clear read on where the cycle is headed. Whether you invest passively as a limited partner or lead deals as a general partner, it tells you when the cycle favors deploying and when it favors patience.",
  audiences: [
    { icon: "TrendingUp", name: "Passive Investors (LPs)", desc: "Read the cycle before you commit to a sponsor's deal — and know what to press your GP on." },
    { icon: "Building2", name: "Active Investors (GPs)", desc: "Underwrite with leading indicators and spot the markets turning first — time acquisitions to the cycle." },
    { icon: "Landmark", name: "Capital Allocators", desc: "Size exposure and pace deployment to the cycle — back markets turning up, flag those rolling over." },
    { icon: "Users", name: "Investment Groups", desc: "Give every allocation a cycle-aware read to guide timing and market selection." },
  ],
  dashLead: "Real-time leading & trailing economic indicators for multifamily investors.",
  marketMetricA: "Rent",
  marketMetricB: "Vac",
  aboutAsset: "multifamily real estate",
  founderRole: "a multifamily operator and market-cycle researcher",
  cycleMetric: "OCCUPANCY",
  cyclePhases: ["Occupancy rising", "Demand > supply", "Supply > demand", "Occupancy falling"],
  mmSubtitle: "Multifamily fundamentals scored and ranked across top U.S. metros — where to deploy.",
  mmMetrics: ["Rent Growth", "Employment", "Vacancy", "Unemployment"],
  fcSubtitle: "5-year forward projections for multifamily fundamentals across leading indicators.",
  fcMetrics: ["Rent Growth", "Vacancy", "Cap Rate", "NOI Growth"],
  fcColLabel: "RENT",
  pfSubtitle: "Monitor your multifamily positions against live market signals.",
  pfChartTitle: "NOI by Asset ($M)",
  footerTagline: "Military Grade Economic Intelligence for Multifamily Investors — Limited Partners, General Partners, Capital Allocators and Investment Groups.",
};
