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

  "Interest Rates": "Lending & Debt Costs",
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

  "Yield Curve Spread": "Rates & Credit Markets",
  "Corporate Credit Spread (BAA)": "Rates & Credit Markets",
  "High-Yield Credit Spread": "Rates & Credit Markets",

  "Consumer Sentiment (UMich)": "Consumer Health",
  "Median Household Income": "Consumer Health",
  "Household Debt Service Ratio": "Consumer Health",
  "Consumer Credit Outstanding (Total)": "Consumer Health",
  "Revolving Consumer Credit": "Consumer Health",
  "Nonrevolving Consumer Credit": "Consumer Health",

  "Leading Indicator (OECD)": "Composite Signals",
};

export const subgroupOf = (name) => SUBGROUP_BY_NAME[name] || "Other";

/** Bucket rows into ordered [group, rows] pairs; empty groups are dropped. */
export function groupRows(rows, order) {
  const by = new Map();
  for (const r of rows) {
    const g = subgroupOf(r.name);
    if (!by.has(g)) by.set(g, []);
    by.get(g).push(r);
  }
  const out = [];
  for (const g of order) if (by.has(g)) out.push([g, by.get(g)]);
  if (by.has("Other")) out.push(["Other", by.get("Other")]);
  return out;
}
