// Maps the Indicators-tab display name (lib/data.js INDICATORS[].name) to its
// Supabase series slug in v_indicator_analytics. Keeping this here keeps the
// comparison tool in sync with the tab without duplicating the catalog.
//
// "Renter-Age Employment (18-34)" is intentionally absent: it's a composite of
// two BLS cohort slugs (emp_2024 + emp_2534), not a single fetchable series, so
// it isn't offered as a comparison line.

export const SLUG_BY_NAME = {
  "Multifamily Building Permits": "permits_5plus",
  "Net Absorption Rate": "absorption",
  "Days On Market": "days_on_market",
  "National Vacancy Rate": "rental_vacancy",
  "Effective Rent Growth": "zori_national",
  "Renter Delinquency Rate": "renter_delinquency",
  "Cap Rate (National Avg)": "cap_rate",
  "Wage Growth": "wage_growth",
  "Job Growth": "employment",
  "Gross Domestic Product": "gdp",
  "Real Consumer Spending": "real_pce",
  "Consumer Sentiment (UMich)": "consumer_sentiment",
  "Inflation": "cpi_headline",
  "Interest Rates": "fed_funds",
  "National Foreclosure Rate": "foreclosure",
  "CRE Loan Delinquency Rate": "cre_delinquency",
  "Yield Curve Spread": "yield_spread",
  "Initial Jobless Claims": "initial_claims",
  "Leading Indicator (OECD)": "cli_oecd",
};
