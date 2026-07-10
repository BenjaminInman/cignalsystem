// Per-vertical live-signal configuration.
//
// This is the layer that makes the LIVE data vertical-aware. Everything else
// (cycle wheel, signals engine, Canary) reads its indicator universe from here
// rather than hardcoding multifamily's set.
//
// Anything a vertical doesn't define falls back to multifamily, so a partially
// authored vertical degrades gracefully instead of rendering empty.

import { DEFAULT_VERTICAL } from "@/lib/vertical-slug";

// --- Cycle wheel: 12 national indicators across the three timing layers. -----
// type: growth | inflation | rate | gdp  (drives metric, sentiment, range gauge)
const WHEEL = {
  multifamily: [
    { slug: "permits_5plus", label: "Permits", role: "leading", type: "growth" },
    { slug: "treasury_10y", label: "Rates", role: "leading", type: "rate" },
    { slug: "employment", label: "Jobs", role: "leading", type: "growth" },
    { slug: "ppi", label: "PPI", role: "leading", type: "inflation" },
    { slug: "gdp", label: "GDP", role: "coincident", type: "gdp" },
    { slug: "real_pce", label: "Real PCE", role: "coincident", type: "growth" },
    { slug: "rental_vacancy", label: "Vacancy", role: "coincident", type: "rate" },
    { slug: "zori_national_mf", label: "Rent", role: "coincident", type: "growth" },
    { slug: "unemployment", label: "Unemp.", role: "trailing", type: "rate" },
    { slug: "wage_growth", label: "Wages", role: "trailing", type: "growth" },
    { slug: "cpi_headline", label: "CPI", role: "trailing", type: "inflation" },
    { slug: "pce_inflation", label: "Inflation", role: "trailing", type: "inflation" },
  ],

  // General real estate: the housing cycle. Permits/starts lead, sales and
  // supply confirm demand, prices and ownership lag.
  "general-real-estate": [
    { slug: "permits_total", label: "Permits", role: "leading", type: "growth" },
    { slug: "mortgage_30y", label: "Mortgage", role: "leading", type: "rate" },
    { slug: "new_home_sales", label: "New Sales", role: "leading", type: "growth" },
    { slug: "months_supply", label: "Supply", role: "leading", type: "rate" },
    { slug: "housing_starts", label: "Starts", role: "coincident", type: "growth" },
    { slug: "housing_completions", label: "Completions", role: "coincident", type: "growth" },
    { slug: "employment", label: "Jobs", role: "coincident", type: "growth" },
    { slug: "gdp", label: "GDP", role: "coincident", type: "gdp" },
    { slug: "case_shiller", label: "Home Prices", role: "trailing", type: "growth" },
    { slug: "homeownership_rate", label: "Ownership", role: "trailing", type: "rate" },
    { slug: "unemployment", label: "Unemp.", role: "trailing", type: "rate" },
    { slug: "cpi_shelter", label: "Shelter CPI", role: "trailing", type: "inflation" },
  ],
};

// --- Signals engine: the composite leading/lagging universe. -----------------
const UNIVERSE = {
  multifamily: {
    leading: [
      "employment", "initial_claims", "permits_5plus", "mf_starts", "consumer_sentiment",
      "cli_oecd", "treasury_10y", "mortgage_30y", "fed_funds", "yield_spread", "ppi",
      "equities_mktval", "days_on_market", "absorption", "emp_2024", "emp_2534",
    ],
    lagging: [
      "cpi_headline", "cpi_shelter", "pce_inflation", "real_pce", "gdp",
      "rental_vacancy", "wage_growth", "cre_delinquency",
    ],
  },
  "general-real-estate": {
    leading: [
      "permits_total", "housing_starts", "new_home_sales", "months_supply",
      "mortgage_30y", "treasury_10y", "yield_spread", "consumer_sentiment",
      "cli_oecd", "employment", "initial_claims", "days_on_market", "fed_funds",
    ],
    lagging: [
      "case_shiller", "zhvi_national", "homeownership_rate", "housing_completions",
      "mortgage_delinquency", "cpi_shelter", "gdp", "real_pce", "unemployment",
    ],
  },
};

export function wheelConfig(vertical) {
  return WHEEL[vertical] || WHEEL[DEFAULT_VERTICAL];
}

export function signalUniverse(vertical) {
  return UNIVERSE[vertical] || UNIVERSE[DEFAULT_VERTICAL];
}

// Short description of the market a vertical reads — used to orient Canary.
const DOMAIN = {
  multifamily: "the U.S. multifamily (apartment) real-estate market",
  "general-real-estate": "the broader U.S. real-estate market, centered on the housing cycle",
  "real-estate-development": "U.S. real-estate development",
  "small-business": "the U.S. small-business economy",
  "personal-finance": "U.S. household and personal-finance conditions",
};

export function verticalDomain(vertical) {
  return DOMAIN[vertical] || DOMAIN[DEFAULT_VERTICAL];
}

// --- Rent series per vertical -------------------------------------------------
// Zillow publishes ZORI as separate property-type cuts. The multifamily site must
// read the multifamily-only cut: blending single-family rentals in dilutes the
// apartment signal, and it dilutes it most in exactly the oversupplied Sun Belt
// metros where SFR is holding up better than apartments (Austin reads -2.4% blended
// vs -3.4% multifamily-only). General real estate legitimately wants the blend.
//
// IMPORTANT: Zillow only publishes the MF cut at NATIONAL and METRO grain. There is
// no multifamily City, ZIP or County file. Sub-metro rent is therefore always the
// all-rentals series and must be labeled as such rather than silently swapped.
const RENT_METRO = {
  multifamily: "zori_metro_mf",
  "general-real-estate": "zori_metro",
};
const RENT_NATIONAL = {
  multifamily: "zori_national_mf",
  "general-real-estate": "zori_national",
};

export function rentMetroSlug(vertical) {
  return RENT_METRO[vertical] || RENT_METRO[DEFAULT_VERTICAL];
}
export function rentNationalSlug(vertical) {
  return RENT_NATIONAL[vertical] || RENT_NATIONAL[DEFAULT_VERTICAL];
}
// True when the metro rent series is multifamily-only (drives UI labels).
export function rentIsMfOnly(vertical) {
  return rentMetroSlug(vertical) === "zori_metro_mf";
}
