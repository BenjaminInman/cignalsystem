// Anatomy — the composition map for composite indicators.
//
// Each entry describes an indicator that is built from other numbers. The
// /api/anatomy route reads this config, pulls the latest live value + YoY for
// any component whose `slug` maps to a tracked series (via v_indicator_analytics),
// converts to a percent per the series `kind`, and computes each part's
// contribution per the composite `type`. Parts without a slug are structural:
// their weight is real, but their live YoY is shown as pending rather than faked.
//
// Nothing here is averaged across the leading/lagging divide — the drawer only
// DISPLAYS the parts and their own cycle roles. `class` is an explicit editorial
// value, never inferred.
//
// kind: how to read a series' value/yoy_change from the analytics view —
//   'index' | 'level' -> value is an index/level; percent = Δ / (value − Δ) × 100
//   'rate'            -> value is already a percent; YoY is a pp change, shown as-is

export const ANATOMY = [
  // ---- FLAGSHIP BASKET ----------------------------------------------------
  {
    slug: "cpi",
    name: "Consumer Price Index (CPI)",
    type: "weighted_sum",
    parentClass: "lagging",
    headline: { slug: "cpi_headline", kind: "index" },
    weightsAsOf: "Dec 2025",
    weightSource: "BLS relative importance",
    formula: "Shelter + Core services + Core goods + Food + Energy → weighted to 100%",
    teach:
      "The headline reads lagging, but 6% of it is energy that leads and swings the print. Watch the shelter third: it trails your asking-rent read by roughly a year, so you already know its direction.",
    components: [
      { label: "Shelter", role: "OER + primary rent", slug: "cpi_shelter", kind: "index", cls: "lagging", weight: 34.9 },
      { label: "Core services, ex-shelter", role: "sticky", slug: null, kind: "index", cls: "coincident", weight: 26.7 },
      { label: "Core goods", role: "vehicles, apparel, furnishings", slug: null, kind: "index", cls: "leading", weight: 18.7 },
      { label: "Food & beverages", role: "at-home + away", slug: null, kind: "index", cls: "coincident", weight: 13.4 },
      { label: "Energy", role: "gasoline + utilities", slug: null, kind: "index", cls: "leading", weight: 6.3 },
    ],
  },

  // ---- PRODUCER-SIDE BASKET (live) ----------------------------------------
  {
    slug: "ppi",
    name: "PPI — Final Demand",
    type: "weighted_sum",
    parentClass: "leading",
    headline: { slug: "ppi", kind: "index" },
    weightsAsOf: "2017 value weights",
    weightSource: "BLS relative importance",
    formula: "Goods + Services + Construction → weighted to 100%",
    teach:
      "Producer prices — what it costs to make things, before it reaches the shelf. PPI sits upstream of CPI, so it leads it: cost pressure shows up here first, then flows to consumers months later. Services are two-thirds of it and stickier; goods are the smaller, faster-moving part where pipeline pressure shows up first. When goods PPI runs hot, watch for it in CPI next.",
    components: [
      { label: "Services", role: "~⅔ of PPI · stickier", slug: "ppi_services", kind: "index", cls: "coincident", weight: 66.7 },
      { label: "Goods", role: "faster-moving · pipeline pressure", slug: "ppi_goods", kind: "index", cls: "leading", weight: 30.7 },
      { label: "Construction", role: "small share", slug: "ppi_construction", kind: "index", cls: "coincident", weight: 2.7 },
    ],
  },

  // ---- DEFLATED (fully live) ----------------------------------------------
  {
    slug: "wage_growth_real",
    name: "Real Wage Growth",
    type: "deflated",
    parentClass: "lagging",
    headline: { slug: "wage_growth_real", kind: "index" },
    formula: "Nominal wage growth − inflation (CPI-U)",
    teach:
      "Nominal pay can climb while real pay falls. When real turns negative, renters absorb the gap through rent-to-income stress long before it shows up in vacancy — the nominal number is telling a story inflation already ended.",
    components: [
      { label: "Nominal wage growth", role: "avg hourly earnings", slug: "wage_growth", kind: "index", cls: "lagging", relation: "nominal" },
      { label: "Inflation (CPI-U)", role: "the deflator", slug: "cpi_headline", kind: "index", cls: "lagging", relation: "deflator" },
      { label: "Real wage growth", role: "what's left", slug: "wage_growth_real", kind: "index", cls: "lagging", relation: "result" },
    ],
  },

  // ---- DIFFERENCE (fully live) --------------------------------------------
  {
    slug: "yield_spread",
    name: "Yield Curve Spread",
    type: "difference",
    parentClass: "leading",
    headline: { slug: "yield_spread", kind: "rate" },
    formula: "10-Year Treasury − 3-Month Treasury",
    teach:
      "The gap is the signal, not either leg. Inversion — a negative spread — has led every modern recession. Read the difference, not the two rates on their own.",
    components: [
      { label: "10-Year Treasury", role: "long end", slug: "treasury_10y", kind: "rate", cls: "leading", relation: "minuend" },
      { label: "3-Month Treasury", role: "policy / short end", slug: null, derive: "long_minus_spread", kind: "rate", cls: "leading", relation: "subtrahend" },
    ],
  },

  // ---- PRODUCT / MULTI-FACTOR INDEX (live) --------------------------------
  {
    slug: "aimi",
    name: "Apartment Investment Market Index (AIMI)",
    type: "product",
    parentClass: "leading",
    headline: { slug: "aimi", kind: "index" },
    formula: "Rental income growth × Property value × Mortgage rate",
    teach:
      "Freddie's apartment-investment index nets a leading rate against two lagging fundamentals. Know which one is moving it and you know what the headline really means: a rising AIMI driven by falling values is a very different market than one driven by rising rents.",
    components: [
      { label: "Rental income (NOI)", role: "MF net operating income", slug: "aimi_rent_index", kind: "index", cls: "lagging", relation: "factor" },
      { label: "Property value", role: "MF prices", slug: "aimi_value_index", kind: "index", cls: "lagging", relation: "factor" },
      { label: "Mortgage rate", role: "cost of capital", slug: null, kind: "rate", cls: "leading", relation: "factor" },
    ],
  },
  // ---- CONTRIBUTION / ADDITIVE IDENTITY (live) ----------------------------
  {
    slug: "gdp",
    name: "Gross Domestic Product",
    type: "contribution",
    parentClass: "lagging",
    // headline is computed as the sum of the four contributions, so parts and
    // whole come from the same BEA vintage and reconcile exactly.
    headline: { compute: "sum", kind: "rate", label: "real GDP, annualized" },
    formula: "Consumption + Investment + Government + Net exports",
    note: "Shows BEA's latest estimate, so the parts reconcile to the whole. The Indicators tab shows the first-print value, which BEA has since revised — GDP gets revised significantly, often more than once.",
    teach:
      "One number, four very different engines. Consumption is ~two-thirds of it and barely moves — it's the ballast, and it lags. Investment is small but swings hard and turns early. Net exports can flip the whole print. A 2% GDP driven by investment is a very different signal than 2% propped up by government spending.",
    components: [
      { label: "Consumption (PCE)", role: "~⅔ of GDP · the ballast", slug: "gdp_contrib_pce", kind: "rate", cls: "lagging", relation: "contribution" },
      { label: "Investment", role: "small but swings hard", slug: "gdp_contrib_investment", kind: "rate", cls: "leading", relation: "contribution" },
      { label: "Government", role: "spending + investment", slug: "gdp_contrib_government", kind: "rate", cls: "coincident", relation: "contribution" },
      { label: "Net exports", role: "can flip the print", slug: "gdp_contrib_netexports", kind: "rate", cls: "coincident", relation: "contribution" },
    ],
  },

  // ---- MEASURE FAMILY (live) ----------------------------------------------
  {
    slug: "inflation",
    name: "Inflation",
    type: "family",
    parentClass: "lagging",
    headline: null, // there is no single inflation number — that's the point
    formula: "The word everyone uses — the same price pressure, measured different ways",
    teach:
      "There is no single \u201cinflation\u201d number. CPI is what the headlines quote. Core strips out food and energy to see the underlying trend. PCE is what the Fed actually targets — a different basket that usually runs cooler. PPI is producer prices, upstream of all of them. When they disagree, the gap is the story: CPI hotter than core means food and energy are doing the work; PPI hotter than CPI means cost pressure is still in the pipeline.",
    components: [
      { label: "CPI (headline)", role: "what the headlines quote", slug: "cpi_headline", kind: "index", cls: "lagging" },
      { label: "Core CPI", role: "ex food & energy — the trend", slug: "cpi_core", kind: "index", cls: "lagging" },
      { label: "PCE", role: "the Fed's target · cooler basket", slug: "pce_inflation", kind: "index", cls: "lagging" },
      { label: "PPI", role: "producer prices · upstream", slug: "ppi", kind: "index", cls: "leading" },
    ],
  },
];
// Presented as a roadmap ("Coming to Anatomy"), not as clickable rows.
export const ANATOMY_MORE = [
  { name: "PCE Price Index", type: "weighted_sum", cls: "lagging", formula: "A different basket than CPI · reweights as consumers substitute" },
  { name: "Rent Burden", type: "ratio", cls: "lagging", formula: "Median gross rent ÷ household income", parts: "both legs tracked" },
  { name: "Real Consumer Spending", type: "deflated", cls: "lagging", formula: "Nominal PCE ÷ PCE deflator" },
  { name: "Household Debt Service Ratio", type: "ratio", cls: "coincident", formula: "Debt payments ÷ disposable income" },
  { name: "Baa Corporate Spread", type: "difference", cls: "leading", formula: "Baa yield − 10-Year Treasury" },
  { name: "Total Nonfarm Payrolls", type: "sum", cls: "leading", formula: "Sum of every industry's payroll" },
  { name: "Consumer Sentiment (UMich)", type: "weighted_sum", cls: "leading", formula: "Current conditions + expectations" },
];

export const TYPE_LABEL = {
  weighted_sum: "Basket",
  difference: "Derived",
  ratio: "Derived",
  product: "Derived",
  deflated: "Derived",
  sum: "Aggregation",
  family: "Measure family",
};
