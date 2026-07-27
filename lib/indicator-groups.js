// Sub-grouping for the Indicators tab.
//
// The tab splits into two sections by `group` in lib/data.js:
//   REAL ESTATE INDICATORS      (everything except group: "macro")
//   NON-REAL ESTATE INDICATORS  (group: "macro")
//
// Within each section, indicators are grouped like-kind so discovery follows a
// logical path — all lending together, all rent/occupancy together, and so on —
// rather than one long undifferentiated list.
//
// Keyed on the display name (lib/data.js INDICATORS[].name), mirroring
// SLUG_BY_NAME and LAYER_BY_NAME so the maps stay in sync without duplicating
// the catalog. Anything unmapped falls into "Other" at the end of its section,
// which is the signal that a new indicator still needs a home here.

// Order matters: this is the reading order down each section.
export const RE_GROUPS = [
  "Supply & Construction",
  "Rents & Occupancy",
  "Renter Demand",
  "For-Sale Market",
  "Values & Returns",
  "Lending & Debt Costs",
  "Distress & Delinquency",
];

export const MACRO_GROUPS = [
  "Labor Market",
  "Growth & Output",
  "Inflation",
  "Rates & Credit Markets",
  "Consumer Health",
  "Composite Signals",
];

export const SUBGROUP_BY_NAME = {
  // ---- Real estate ----
  "Multifamily Building Permits": "Supply & Construction",

  "Market Rent Growth (All Rentals)": "Rents & Occupancy",
  "Market Rent Growth (Multifamily)": "Rents & Occupancy",
  "Median Gross Rent": "Rents & Occupancy",
  "National Vacancy Rate": "Rents & Occupancy",
  "Rent Burden": "Rents & Occupancy",
  "Days to Lease (Apartments)": "Rents & Occupancy",

  "Renter Demand Index (ZORDI)": "Renter Demand",
  "Absorption Rate (3-Mo)": "Renter Demand",
  "Rentership Rate": "Renter Demand",
  "Renter-Age Employment (20-34)": "Renter Demand",

  "Existing Home Sales": "For-Sale Market",
  "Days On Market (For-Sale Homes)": "For-Sale Market",
  "Home Value Index": "For-Sale Market",
  "Median Home Value": "For-Sale Market",

  "Cap Rate (National Avg)": "Values & Returns",
  "Apartment Investment Index (AIMI)": "Values & Returns",
  "AIMI Rent Component": "Values & Returns",
  "AIMI Value Component": "Values & Returns",

  "Federal Funds Rate": "Lending & Debt Costs",
  "2-Year Treasury": "Lending & Debt Costs",
  "SOFR (Overnight Rate)": "Lending & Debt Costs",
  "MF Lending Standards (SLOOS)": "Lending & Debt Costs",

  "Renter Delinquency Rate": "Distress & Delinquency",
  "National Foreclosure Rate": "Distress & Delinquency",
  "CRE Loan Delinquency Rate": "Distress & Delinquency",
  "Mortgage Delinquency Rate (Single-Family)": "Distress & Delinquency",
  "Credit Card Delinquency Rate": "Distress & Delinquency",
  "Consumer Loan Delinquency Rate": "Distress & Delinquency",

  // ---- Non-real estate ----
  "Job Growth": "Labor Market",
  "Unemployment Rate": "Labor Market",
  "Job Openings (JOLTS)": "Labor Market",
  "Quits Rate (JOLTS)": "Labor Market",
  "Initial Jobless Claims": "Labor Market",
  "Wage Growth": "Labor Market",
  "Real Wage Growth": "Labor Market",

  "Gross Domestic Product": "Growth & Output",
  "Real Consumer Spending": "Growth & Output",

  "CPI (All Urban)": "Inflation",
  "PPI (Final Demand)": "Inflation",
  "PCE Price Index": "Inflation",
  "Core CPI": "Inflation",
  "Core PCE": "Inflation",
  "Core PPI": "Inflation",
  "Multifamily Starts": "Supply & Construction",
  "Housing Starts (Total)": "Supply & Construction",
  "Building Permits (Total)": "Supply & Construction",
  "Housing Completions": "Supply & Construction",
  "Apartment Rent Estimate": "Rents & Occupancy",
  "Apartment Vacancy Index": "Rents & Occupancy",
  "Homeownership Rate": "Renter Demand",
  "New Home Sales": "For-Sale Market",
  "Months' Supply of Homes": "For-Sale Market",
  "Case-Shiller Home Price Index": "For-Sale Market",
  "10-Year Treasury": "Lending & Debt Costs",
  "30-Year Mortgage Rate": "Lending & Debt Costs",
  "CPI Shelter": "Inflation",

  "Yield Curve Spread": "Lending & Debt Costs",
  "Corporate Credit Spread (BAA)": "Rates & Credit Markets",
  "High-Yield Credit Spread": "Rates & Credit Markets",

  "Consumer Sentiment (UMich)": "Consumer Health",
  "Median Household Income": "Consumer Health",
  "Personal Saving Rate": "Consumer Health",
  "Household Debt Service Ratio": "Consumer Health",
  "Consumer Credit Outstanding (Total)": "Consumer Health",
  "Revolving Consumer Credit": "Consumer Health",
  "Nonrevolving Consumer Credit": "Consumer Health",

  "Leading Indicator (OECD)": "Composite Signals",
};

export const subgroupOf = (name) => SUBGROUP_BY_NAME[name] || "Other";

/** Bucket rows into ordered [group, rows] pairs; empty groups are dropped. */
// Canonical order WITHIN each subgroup.
//
// groupRows previously preserved the order rows happened to sit in lib/data.js,
// which has accreted over two years -- so like-kind indicators drifted apart as
// new ones were appended to the end. The 2-Year and 10-Year Treasury ended up
// separated by lending standards; headline and core inflation pairs were split;
// the supply pipeline ran out of flow order. Sequence is meaning on this page,
// so it is declared here rather than inherited from edit history.
//
// Anything not listed sorts to the end of its group, alphabetically, so a new
// indicator degrades to a sane position instead of landing wherever it was
// pasted.
export const ORDER_IN_GROUP = {
  // The pipeline in the order it actually flows, each total beside its
  // multifamily cut: permits -> starts -> completions.
  "Supply & Construction": [
    "Building Permits (Total)",
    "Multifamily Building Permits",
    "Housing Starts (Total)",
    "Multifamily Starts",
    "Housing Completions",
  ],
  // Rents first, then occupancy, then leasing velocity.
  "Rents & Occupancy": [
    "Market Rent Growth (All Rentals)",
    "Market Rent Growth (Multifamily)",
    "Apartment Rent Estimate",
    "Median Gross Rent",
    "Rent Burden",
    "National Vacancy Rate",
    "Apartment Vacancy Index",
    "Days to Lease (Apartments)",
  ],
  "Renter Demand": [
    "Renter Demand Index (ZORDI)",
    "Absorption Rate (3-Mo)",
    "Rentership Rate",
    "Homeownership Rate",
    "Renter-Age Employment (20-34)",
  ],
  // Transactions, then inventory and velocity, then prices.
  "For-Sale Market": [
    "Existing Home Sales",
    "New Home Sales",
    "Months' Supply of Homes",
    "Days On Market (For-Sale Homes)",
    "Median Home Value",
    "Home Value Index",
    "Case-Shiller Home Price Index",
  ],
  "Values & Returns": [
    "Cap Rate (National Avg)",
    "Apartment Investment Index (AIMI)",
    "AIMI Rent Component",
    "AIMI Value Component",
  ],
  // The rate ladder, short end to long: policy, overnight, 2Y, 10Y, then the
  // curve spread derived from the two above it, then the mortgage rate it
  // ultimately sets, then lending conditions.
  "Lending & Debt Costs": [
    "Federal Funds Rate",
    "SOFR (Overnight Rate)",
    "2-Year Treasury",
    "10-Year Treasury",
    "Yield Curve Spread",
    "30-Year Mortgage Rate",
    "MF Lending Standards (SLOOS)",
  ],
  // Property-side distress first, then household credit.
  "Distress & Delinquency": [
    "Renter Delinquency Rate",
    "Mortgage Delinquency Rate (Single-Family)",
    "National Foreclosure Rate",
    "CRE Loan Delinquency Rate",
    "Credit Card Delinquency Rate",
    "Consumer Loan Delinquency Rate",
  ],
  // Headline labor first, then JOLTS internals, then pay.
  "Labor Market": [
    "Job Growth",
    "Unemployment Rate",
    "Initial Jobless Claims",
    "Job Openings (JOLTS)",
    "Quits Rate (JOLTS)",
    "Wage Growth",
    "Real Wage Growth",
  ],
  "Growth & Output": ["Gross Domestic Product", "Real Consumer Spending"],
  // Each headline immediately followed by its core, upstream to downstream:
  // producer prices, consumer prices, then the gauge the Fed targets.
  Inflation: [
    "PPI (Final Demand)",
    "Core PPI",
    "CPI (All Urban)",
    "Core CPI",
    "CPI Shelter",
    "PCE Price Index",
    "Core PCE",
  ],
  "Rates & Credit Markets": [
    "Corporate Credit Spread (BAA)",
    "High-Yield Credit Spread",
  ],
  "Consumer Health": [
    "Consumer Sentiment (UMich)",
    "Median Household Income",
    "Personal Saving Rate",
    "Household Debt Service Ratio",
    "Consumer Credit Outstanding (Total)",
    "Revolving Consumer Credit",
    "Nonrevolving Consumer Credit",
  ],
};

export function groupRows(rows, order) {
  const by = new Map();
  for (const r of rows) {
    const g = subgroupOf(r.name);
    if (!by.has(g)) by.set(g, []);
    by.get(g).push(r);
  }
  // Sort within each group by the canonical sequence. Unlisted rows sort to the
  // end alphabetically rather than to wherever they were appended in data.js.
  for (const [g, rs] of by) {
    const seq = ORDER_IN_GROUP[g];
    if (!seq) continue;
    rs.sort((a, b) => {
      const ia = seq.indexOf(a.name);
      const ib = seq.indexOf(b.name);
      if (ia === -1 && ib === -1) return a.name.localeCompare(b.name);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }
  const out = [];
  for (const g of order) if (by.has(g)) out.push([g, by.get(g)]);
  if (by.has("Other")) out.push(["Other", by.get("Other")]);
  return out;
}
