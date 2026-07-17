// Onion Framework — the lens that organizes the Indicators tab.
//
// The peel runs from the broad economy inward to the deal you underwrite:
//   Layer 3 Macro         -> the whole economy
//   Layer 2 MF Industry   -> the national multifamily market
//   Layer 1 Submarket     -> the same read at your local grain
//
// Assignment is by geography/scope, not topic — which is why "rent" can appear
// at more than one layer (macro shelter inflation vs. national industry rent vs.
// your submarket's rent). Keyed on the Indicators-tab display name
// (lib/data.js INDICATORS[].name), mirroring SLUG_BY_NAME so the two stay
// in sync without duplicating the catalog.

// Ordered outer -> inner. `r` is the ring radius in the 220x220 onion viewBox.
export const ONION_LAYERS = [
  {
    id: "macro",
    num: 3,
    label: "Macro",
    scope: "The economy",
    tagline: "Broad forces that move every market at once.",
    teach:
      "National growth, rates, jobs, inflation and credit health — the weather system every deal sits inside. Read these first; they lead.",
    accent: "#6E92B4",
    r: 100,
  },
  {
    id: "industry",
    num: 2,
    label: "Multifamily Industry",
    scope: "National MF market",
    tagline: "Where macro pressure lands on the asset class.",
    teach:
      "Supply, rent, vacancy and capital for multifamily specifically — permits, absorption, national rent and vacancy, cap rates, distress. The confirm layer.",
    accent: "#E8B04B",
    r: 72,
  },
  {
    id: "submarket",
    num: 1,
    label: "Submarket",
    scope: "Your local grain",
    tagline: "The same read, down to the market you underwrite.",
    teach:
      "Metro- and ZIP-level rent, jobs, migration and demographics. This is where you localize the national read — explored in Market Maps.",
    accent: "#F5B544",
    r: 44,
  },
];

export const LAYER_META = Object.fromEntries(ONION_LAYERS.map((l) => [l.id, l]));

// Display name -> layer id. Every name on the Indicators tab is mapped.
export const LAYER_BY_NAME = {
  // Layer 3 — Macro (the economy)
  "Median Household Income": "macro",
  "Median Home Value": "macro",
  "Existing Home Sales": "macro",
  "2-Year Treasury": "macro",
  "Corporate Credit Spread (BAA)": "macro",
  "High-Yield Credit Spread": "macro",
  "SOFR (Overnight Rate)": "macro",
  "Job Openings (JOLTS)": "macro",
  "Quits Rate (JOLTS)": "macro",
  "Renter-Age Employment (20-34)": "macro",
  "Wage Growth": "macro",
  "Real Wage Growth": "macro",
  "Job Growth": "macro",
  "Gross Domestic Product": "macro",
  "Real Consumer Spending": "macro",
  "Consumer Sentiment (UMich)": "macro",
  "CPI (All Urban)": "macro",
  "PPI (Final Demand)": "macro",
  "PCE Price Index": "macro",
  "Interest Rates": "macro",
  "Yield Curve Spread": "macro",
  "Initial Jobless Claims": "macro",
  "Leading Indicator (OECD)": "macro",
  "Household Debt Service Ratio": "macro",
  "Consumer Credit Outstanding (Total)": "macro",
  "Revolving Consumer Credit": "macro",
  "Nonrevolving Consumer Credit": "macro",
  "Credit Card Delinquency Rate": "macro",
  "Consumer Loan Delinquency Rate": "macro",
  "Mortgage Delinquency Rate (Single-Family)": "macro",

  // Layer 2 — Multifamily Industry (national MF market)
  "Days to Lease (Apartments)": "industry",
  "Apartment Investment Index (AIMI)": "industry",
  "AIMI Rent Component": "industry",
  "AIMI Value Component": "industry",
  "Rent Burden": "industry",
  "Median Gross Rent": "industry",
  "Rentership Rate": "industry",
  "MF Lending Standards (SLOOS)": "industry",
  "Multifamily Building Permits": "industry",
  "Home Value Index": "industry",
  "Absorption Rate (3-Mo)": "industry",
  "Days On Market (For-Sale Homes)": "industry",
  "National Vacancy Rate": "industry",
  "Market Rent Growth (All Rentals)": "industry",
  "Market Rent Growth (Multifamily)": "industry",
  "Renter Delinquency Rate": "industry",
  "Cap Rate (National Avg)": "industry",
  "National Foreclosure Rate": "industry",
  "CRE Loan Delinquency Rate": "industry",

  // Layer 1 — Submarket (local grain): none on the national Indicators tab;
  // these signals are localized in Market Maps.
};

export function layerOf(name) {
  return LAYER_BY_NAME[name] || null;
}

// Conservative floor shown as "N+" before a market is searched — chosen so any
// resolvable ZIP/metro meets or beats it (most return 8–10). Refined to the
// exact rendered count after a lookup.
export const SUBMARKET_FLOOR = 5;

// Signals the submarket module surfaces once a market is resolved. Coverage
// varies by market (a handful of large metros add Rent CPI), so this is the
// broadly-available set used for the Layer 1 count before a lookup narrows it
// to the exact market searched.
export const SUBMARKET_SIGNALS = [
  "Observed Rent (ZORI)",
  "Local Job Growth",
  "Real GDP (County)",
  "Unemployment Rate",
  "Rent Price Level",
  "Apartment Vacancy",
  "Rental Days on Market",
  "In-Migrant Income",
  "Net Migration",
  "Affluence Trend",
];
