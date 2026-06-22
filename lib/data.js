// All figures are illustrative sample data for layout/demo purposes.
// Replace with live feeds (FRED, Census, Treasury, ATTOM, etc.) for production.

export const TICKER = [
  { label: "AVG RENT GROWTH", value: "+3.8% YoY", delta: "+0.2%", dir: "up" },
  { label: "CAP RATE (NATAVG)", value: "5.15%", delta: "+12bps", dir: "down" },
  { label: "10Y TREASURY", value: "4.42%", delta: "-8bps", dir: "up" },
  { label: "MULTIFAMILY STARTS", value: "328K", delta: "-6.1%", dir: "down" },
  { label: "ABSORPTION RATE", value: "92.4%", delta: "+1.2%", dir: "up" },
  { label: "EMPLOYMENT GROWTH", value: "+1.9%", delta: "+0.1%", dir: "up" },
  { label: "CPI SHELTER", value: "+5.1%", delta: "-0.4%", dir: "down" },
  { label: "NATIONAL VACANCY", value: "5.2%", delta: "-0.3%", dir: "up" },
];

export const COMPOSITE = { label: "BULLISH", confidence: 60, tone: "bull" };

export const DASH_STATS = [
  { label: "BULLISH SIGNALS", value: "6", unit: "/10", tone: "bull" },
  { label: "BEARISH SIGNALS", value: "2", unit: "/10", tone: "bear" },
  { label: "MARKETS TRACKED", value: "42", unit: "MSAs", tone: "ink" },
  { label: "DATA POINTS", value: "1,200+", unit: "live", tone: "signal" },
];

// sparkline series (just relative points)
const up1 = [3, 3.2, 3.1, 3.4, 3.6, 3.8, 4.0];
const down1 = [5, 4.6, 4.8, 4.4, 4.5, 4.2, 4.1];

export const LEADING_CARDS = [
  { cat: "SUPPLY", name: "Multifamily Permit Activity", value: "328K", delta: "-6.1%", dir: "down", tone: "bear", note: "Annualized starts declining — supply pressure easing", series: down1 },
  { cat: "DEMAND", name: "Lease-Up Absorption Rate", value: "92.4%", delta: "+1.2%", dir: "up", tone: "bull", note: "Strong demand absorbing new deliveries above trend", series: up1 },
  { cat: "MACRO", name: "Renter-Age Employment", value: "+1.9%", delta: "+0.1%", dir: "up", tone: "bull", note: "18–34 cohort employment holding steady, fueling demand", series: up1 },
  { cat: "DEMAND", name: "Net Renter Migration Index", value: "112", delta: "+4pts", dir: "up", tone: "bull", note: "Sun Belt & Mountain West seeing elevated in-migration", series: up1 },
];

export const TRAILING_CARDS = [
  { cat: "PERFORMANCE", name: "National Vacancy Rate", value: "5.2%", delta: "-0.3%", dir: "up", tone: "bull", note: "Declining for 18 months — fundamentals tightening", series: down1 },
  { cat: "PERFORMANCE", name: "Market Rent Growth", value: "+3.8%", delta: "-0.2%", dir: "down", tone: "neutral", note: "Stabilizing after normalization from peak", series: up1 },
  { cat: "CAPITAL", name: "Cap Rate (National Avg)", value: "5.15%", delta: "+12bps", dir: "down", tone: "bear", note: "Expanding for 6 quarters — repricing underway", series: up1 },
  { cat: "CAPITAL", name: "Debt Service Coverage", value: "1.28x", delta: "-0.04", dir: "down", tone: "neutral", note: "Compression from higher rates on floating debt", series: down1 },
];

// TOP_MARKETS is derived from MARKET_GROUPS further below (top 6 by score) so the
// home page's Top Markets box always matches the Market Maps page exactly.

// Indicators page
export const INDICATORS = [
  { cat: "SUPPLY", type: "LEADING", name: "Multifamily Building Permits", value: "328K", unit: "annualized", change: "-6.1% MoM", note: "Declining for 3 consecutive months", tone: "bear",
    measures: "Forward-looking supply gauge. Falling permits reduce future inventory pressure and support rent growth in 18–24 months.",
    impact: "Positive for existing owners — fewer units competing for renters.",
    trend: [420, 408, 398, 388, 375, 360, 345, 330, 318] },
  { cat: "DEMAND", type: "LEADING", name: "Net Absorption Rate", value: "92.4%", unit: "of new supply", change: "+1.2% QoQ", note: "Rising for 2 consecutive quarters", tone: "bull",
    measures: "Demand gauge — the share of newly delivered units that get leased. Rising absorption means demand is keeping pace with supply.",
    impact: "Supportive of occupancy and pricing power; strong lease-up lowers concession risk.",
    trend: [85, 86, 87, 88, 89, 90, 91, 91.8, 92.4] },
  { cat: "DEMAND", type: "LEADING", name: "Days On Market", value: "52", unit: "median days", change: "+3 days MoM", note: "Realtor.com national median", tone: "bear",
    measures: "How long for-sale homes sit before going under contract. Rising days-on-market signals cooling demand and more buyer leverage — an early read on housing-market momentum.",
    impact: "Lengthening days-on-market is an early demand-softening signal; watch it alongside absorption and rent growth for cycle turns.",
    trend: [38, 40, 44, 48, 50, 53, 55, 54, 52] },
  { cat: "PERFORMANCE", type: "TRAILING", name: "National Vacancy Rate", value: "5.2%", unit: "national avg", change: "-0.3% YoY", note: "Declining for 18 months", tone: "bull",
    measures: "Trailing measure of unoccupied units nationally. Falling vacancy tightens the market and strengthens landlord leverage.",
    impact: "Lower vacancy supports rent growth and steadier cash flow for owners.",
    trend: [5.9, 5.8, 5.7, 5.6, 5.5, 5.45, 5.35, 5.28, 5.2] },
  { cat: "PERFORMANCE", type: "TRAILING", name: "Market Rent Growth", value: "+3.8%", unit: "YoY", change: "-0.2% from prior period", note: "Stabilizing after normalization from peak", tone: "neutral",
    measures: "Year-over-year change in Zillow's national observed market rent (ZORI) across all rental types — single-family, condo, and multifamily combined. A timely read on overall asking-rent momentum and the ceiling across the full rental market.",
    impact: "Cooling rent growth signals normalization; underwrite to sustainable, not peak, rent trends.",
    trend: [7.2, 6.5, 5.8, 5.1, 4.6, 4.2, 4.0, 3.9, 3.8] },
  { cat: "PERFORMANCE", type: "TRAILING", name: "Market Rent Growth (Multifamily)", value: "+1.0%", unit: "YoY", change: "multifamily only", note: "Asking rents for 5+ unit buildings only", tone: "neutral",
    measures: "Year-over-year change in Zillow's national observed rent (ZORI) for multifamily (5+ unit) buildings only — the apartment-specific cut, excluding single-family and condo rentals.",
    impact: "The pure multifamily read. It typically runs below the blended all-rentals figure when single-family rents outpace apartments — a direct gauge of apartment pricing power.",
    trend: [6.8, 5.4, 4.1, 3.0, 2.2, 1.6, 1.3, 1.1, 1.0] },
  { cat: "PERFORMANCE", type: "TRAILING", name: "Renter Delinquency Rate", value: "13.4%", unit: "of renters", change: "CFPB data", note: "Share of renters behind on rent", tone: "bear",
    measures: "Share of renters behind on rent — measured as the fraction incurring a late fee in the prior 12 months (CFPB rental payment data).",
    impact: "Rising renter delinquency pressures collections, NOI, and occupancy — an early read on demand-side stress that precedes concessions and bad debt.",
    trend: [11.8, 12.1, 12.4, 12.7, 12.9, 13.0, 13.2, 13.3, 13.4] },
  { cat: "CAPITAL", type: "TRAILING", name: "Cap Rate (National Avg)", value: "5.15%", unit: "blended", change: "+12bps QoQ", note: "Expanding for 6 quarters", tone: "bear",
    measures: "Blended national cap rate. Rising cap rates compress values as buyers demand higher yields.",
    impact: "Expansion pressures valuations — favorable for buyers, a headwind for sellers and refinancings.",
    trend: [4.4, 4.55, 4.7, 4.8, 4.9, 5.0, 5.05, 5.1, 5.15] },
  { cat: "MACRO", type: "LEADING", name: "Renter-Age Employment (18-34)", value: "+1.9%", unit: "YoY", change: "+0.1% MoM", note: "Steady uptrend for 12 months", tone: "bull",
    measures: "Employment growth among prime renter-age cohorts — a leading driver of household formation and rental demand.",
    impact: "Steady job gains in this cohort underpin demand and new-renter formation.",
    trend: [1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.85, 1.9] },
  { cat: "MACRO", type: "LEADING", name: "Wage Growth", group: "macro", value: "+4.1%", unit: "YoY", change: "-0.1% MoM", note: "Cooling toward the pre-pandemic norm", tone: "neutral",
    measures: "Year-over-year growth in worker pay. Wages set the ceiling on what renters can afford and underpin demand for housing.",
    impact: "Steady wage gains support rent-growth potential and lease-up; rapid deceleration warns of softening demand and affordability stress.",
    trend: [5.4, 5.1, 4.9, 4.7, 4.5, 4.4, 4.3, 4.2, 4.1] },
  { cat: "MACRO", type: "LEADING", name: "Job Growth", group: "macro", value: "+165K", unit: "nonfarm, MoM", change: "-12K vs prior", note: "Steady but moderating hiring", tone: "bull",
    measures: "Net new payroll jobs added each month — the primary engine of household formation and rental demand.",
    impact: "Sustained hiring drives new-renter formation and absorption; a hiring slowdown is an early demand-softening signal.",
    trend: [225, 210, 198, 188, 182, 176, 172, 168, 165] },
  { cat: "MACRO", type: "TRAILING", name: "Gross Domestic Product", group: "macro", value: "+2.3%", unit: "real, annualized", change: "-0.2% QoQ", note: "Solid but decelerating growth", tone: "bull",
    measures: "The broadest measure of economic output. Real GDP growth reflects the overall economic health that housing demand rides on.",
    impact: "Expansion supports incomes and demand; contraction pressures occupancy, rents, and values across the cycle.",
    trend: [3.1, 2.9, 2.8, 2.7, 2.6, 2.5, 2.4, 2.35, 2.3] },
  { cat: "MACRO", type: "LEADING", name: "Real Consumer Spending", group: "macro", value: "+2.6%", unit: "YoY real", change: "+0.1% MoM", note: "Resilient consumer holding up", tone: "bull",
    measures: "Inflation-adjusted household spending (real PCE) — a read on consumer health that leads broader activity and employment.",
    impact: "Resilient spending sustains the labor market and rental demand; a pullback foreshadows slowing job growth and softer demand.",
    trend: [2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.55, 2.58, 2.6] },
  { cat: "MACRO", type: "LEADING", name: "Consumer Sentiment (UMich)", group: "macro", value: "104.7", unit: "index", change: "+1.8 MoM", note: "Rebounding off recent lows", tone: "bull",
    measures: "Survey-based gauge of how households feel about the economy and their finances — a leading indicator of spending and major decisions like moving.",
    impact: "Rising confidence supports household formation and mobility; falling confidence often precedes weaker demand and leasing.",
    trend: [97, 98.5, 100, 101, 102, 103, 103.5, 104, 104.7] },
  { cat: "MACRO", type: "TRAILING", name: "Inflation", group: "macro", value: "+2.9%", unit: "CPI YoY", change: "-0.1% MoM", note: "Grinding toward the 2% target", tone: "neutral",
    measures: "The year-over-year change in consumer prices (CPI). Inflation drives Fed policy, financing costs, and operating expenses.",
    impact: "Cooling inflation opens the door to rate cuts that lift values and lower debt costs; sticky inflation keeps rates and cap rates elevated.",
    trend: [3.7, 3.5, 3.4, 3.2, 3.1, 3.0, 2.95, 2.92, 2.9] },
  { cat: "MACRO", type: "LEADING", name: "Interest Rates", value: "4.50%", unit: "Fed funds upper", change: "0 bps", note: "Fed on hold; cuts priced later in year", tone: "neutral",
    measures: "The Federal Reserve's policy rate, which anchors borrowing costs across the economy and the price of real-estate capital.",
    impact: "Higher rates raise debt costs and push cap rates up, pressuring values; cuts ease financing and support pricing and transaction volume.",
    trend: [5.5, 5.5, 5.5, 5.25, 5.0, 4.75, 4.5, 4.5, 4.5] },
  { cat: "CAPITAL", type: "TRAILING", name: "National Foreclosure Rate", value: "0.38%", unit: "of mortgages", change: "+0.02% QoQ", note: "Low but ticking up off historic lows", tone: "bear",
    measures: "The share of mortgages in some stage of foreclosure — a measure of household financial distress and a lagging signal of cycle stress.",
    impact: "A rising rate signals consumer stress and can foreshadow distressed supply and weaker for-sale demand; very low rates reflect a healthy credit backdrop.",
    trend: [0.28, 0.29, 0.30, 0.32, 0.33, 0.35, 0.36, 0.37, 0.38] },
  { cat: "CAPITAL", type: "TRAILING", name: "CRE Loan Delinquency Rate", value: "1.56%", unit: "of CRE loans", change: "+0.0pp QoQ", note: "Owner-side distress in the commercial real estate debt market", tone: "bear",
    measures: "Share of commercial real estate bank loans 30+ days past due or in nonaccrual (Federal Reserve). The Fed's CRE category includes multifamily alongside construction, office, retail, and other nonresidential.",
    impact: "Rising loan delinquency is a direct read on owner/borrower stress — it precedes forced sales, lender pullback, and repricing, and tends to climb late-cycle into recession.",
    trend: [0.7, 0.8, 0.9, 1.0, 1.2, 1.4, 1.5, 1.5, 1.56] },
  { cat: "MACRO", type: "LEADING", name: "Yield Curve Spread", group: "macro", value: "0.66pp", unit: "10Y minus 3M", change: "+0.60pp YoY", note: "Curve un-inverted — recession signal easing", tone: "bull",
    measures: "The gap between 10-year and 3-month Treasury yields. An inverted (negative) spread has preceded every modern recession; a positive, widening spread signals receding recession risk.",
    impact: "Drives the direction of cap rates and the cost and availability of acquisition and refinancing debt; inversion is an early warning for demand and values.",
    trend: [-0.5, -0.4, -0.3, -0.1, 0.1, 0.3, 0.45, 0.55, 0.66] },
  { cat: "MACRO", type: "LEADING", name: "Initial Jobless Claims", group: "macro", value: "226K", unit: "weekly", change: "+5K YoY", note: "Low but edging up — watch for labor softening", tone: "neutral",
    measures: "Weekly count of new unemployment filings — one of the fastest available reads on the direction of the labor market.",
    impact: "Rising claims are an early sign of softening jobs and household formation, which feed rental demand; falling claims signal a firm demand backdrop.",
    trend: [210, 214, 218, 220, 222, 223, 224, 225, 226] },
  { cat: "MACRO", type: "LEADING", name: "Leading Indicator (OECD)", group: "macro", value: "101.0", unit: "index, 100 = trend", change: "+1.4 YoY", note: "Above trend and rising — points to expansion", tone: "bull",
    measures: "A composite of forward-looking inputs (permits, orders, the yield curve, sentiment) designed to flag turning points in the business cycle several months ahead.",
    impact: "Above 100 and rising points to expansion that supports demand; below 100 and falling flags a coming slowdown owners should underwrite for.",
    trend: [98.2, 98.8, 99.3, 99.8, 100.2, 100.5, 100.7, 100.9, 101.0] },
];

// Market Maps page
export const MARKET_GROUPS = [
  {
    region: "TOP MARKETS",
    markets: [
      { city: "Atlanta, GA", rent: "+3.8%", vac: "5.1%", cap: "5.1%", noi: "+4.9%", score: 82, tone: "bull" },
      { city: "Miami, FL", rent: "+3.5%", vac: "4.6%", cap: "4.7%", noi: "+4.4%", score: 81, tone: "bull" },
      { city: "Dallas, TX", rent: "+2.8%", vac: "6.2%", cap: "5.3%", noi: "+3.9%", score: 80, tone: "bull" },
      { city: "Jersey City, NJ", rent: "+3.0%", vac: "4.0%", cap: "4.8%", noi: "+3.6%", score: 78, tone: "bull" },
      { city: "Houston, TX", rent: "+2.5%", vac: "6.8%", cap: "5.6%", noi: "+3.4%", score: 76, tone: "bull" },
    ],
  },
  {
    region: "SUN BELT",
    markets: [
      { city: "Austin, TX", rent: "+5.1%", vac: "4.1%", cap: "4.9%", noi: "+6.2%", score: 84, tone: "bull" },
      { city: "Nashville, TN", rent: "+4.7%", vac: "4.4%", cap: "5.0%", noi: "+5.8%", score: 83, tone: "bull" },
      { city: "Raleigh, NC", rent: "+3.7%", vac: "4.8%", cap: "5.0%", noi: "+4.7%", score: 80, tone: "bull" },
      { city: "Orlando, FL", rent: "+3.6%", vac: "5.0%", cap: "5.1%", noi: "+4.6%", score: 79, tone: "bull" },
      { city: "Tampa, FL", rent: "+3.4%", vac: "5.2%", cap: "5.2%", noi: "+4.3%", score: 78, tone: "bull" },
      { city: "Phoenix, AZ", rent: "+3.2%", vac: "5.8%", cap: "5.2%", noi: "+4.1%", score: 77, tone: "bull" },
      { city: "Jacksonville, FL", rent: "+3.0%", vac: "5.6%", cap: "5.5%", noi: "+3.8%", score: 74, tone: "bull" },
      { city: "San Antonio, TX", rent: "+2.6%", vac: "6.0%", cap: "5.4%", noi: "+3.3%", score: 72, tone: "neutral" },
    ],
  },
  {
    region: "SECONDARY & PIVOT",
    markets: [
      { city: "Salt Lake City, UT", rent: "+3.5%", vac: "5.0%", cap: "5.0%", noi: "+4.5%", score: 77, tone: "bull" },
      { city: "Indianapolis, IN", rent: "+2.9%", vac: "5.4%", cap: "6.2%", noi: "+3.7%", score: 75, tone: "bull" },
      { city: "Fayetteville, AR", rent: "+3.3%", vac: "5.2%", cap: "6.0%", noi: "+4.0%", score: 74, tone: "bull" },
      { city: "Savannah, GA", rent: "+3.1%", vac: "5.5%", cap: "5.8%", noi: "+3.9%", score: 73, tone: "bull" },
      { city: "Colorado Springs, CO", rent: "+2.7%", vac: "5.6%", cap: "5.6%", noi: "+3.3%", score: 71, tone: "neutral" },
      { city: "Birmingham, AL", rent: "+2.4%", vac: "6.4%", cap: "6.8%", noi: "+3.0%", score: 70, tone: "bull" },
      { city: "Lubbock, TX", rent: "+2.6%", vac: "5.8%", cap: "6.5%", noi: "+3.2%", score: 69, tone: "neutral" },
    ],
  },
];

// Home "Top Markets" box — the 6 highest-scored markets, pulled straight from
// MARKET_GROUPS so the home page can never drift from the Market Maps page.
export const TOP_MARKETS = MARKET_GROUPS
  .flatMap((g) => g.markets)
  .slice()
  .sort((a, b) => b.score - a.score)
  .slice(0, 6)
  .map(({ city, rent, vac, score, tone }) => ({ city, rent, vac, score, tone }));

// Forecasts page
export const FORECAST_MARKETS = [
  { city: "Austin, TX", y1: "+5.2%", y3: "+14.1%", conf: 84, tone: "bull" },
  { city: "Nashville, TN", y1: "+4.7%", y3: "+12.8%", conf: 81, tone: "bull" },
  { city: "Phoenix, AZ", y1: "+3.1%", y3: "+9.2%", conf: 73, tone: "bull" },
  { city: "Denver, CO", y1: "+2.4%", y3: "+7.1%", conf: 62, tone: "neutral" },
  { city: "Chicago, IL", y1: "-0.2%", y3: "+1.5%", conf: 58, tone: "bear" },
  { city: "San Francisco, CA", y1: "+0.8%", y3: "+3.5%", conf: 55, tone: "neutral" },
];

export const FORECAST_DRIVERS = [
  { name: "Supply Decline", weight: "High", tone: "bull", note: "Permit pullback of 18% since peak will reduce deliveries by 2026–27, supporting occupancy and pricing power." },
  { name: "Employment Cohort Growth", weight: "High", tone: "bull", note: "18–34 age employment at +1.9% YoY — primary renter demographic expanding at above-average pace." },
  { name: "Rate Environment", weight: "Medium", tone: "neutral", note: "10Y Treasury anchoring at 4.0–4.5% range through 2025 — cap rate normalization gradual, not sudden." },
  { name: "Debt Maturity Wall", weight: "Medium", tone: "neutral", note: "~$32B floating-rate debt maturing in H2 2025 creates potential forced sellers — opportunity for equity buyers." },
  { name: "Affordability Ceiling", weight: "Low", tone: "bear", note: "Renter income ratios approaching 30%+ in top metros — limits ability to push rent beyond 4–5% in premium markets." },
];

// Signals page
export const SIGNALS = [
  { tone: "bull", title: "Permit Activity Below 5-Year Average", body: "Multifamily permits annualized at 328K — 18% below 5-year mean. Supply pipeline thinning, supporting rent growth in 18–24 months.", tags: ["Supply", "National"], time: "2 hours ago", conf: 87 },
  { tone: "bear", title: "Cap Rate Spread Compression Reversal", body: "10Y Treasury at 4.42% vs. avg cap rate 5.15% — 73bps spread. Historical spread is 125–150bps. Refinancing stress risk elevated for 2024–2025 maturities.", tags: ["Capital", "National", "Gateway Markets"], time: "4 hours ago", conf: 79 },
  { tone: "bull", title: "Sun Belt Net Migration Accelerating", body: "IRS migration data confirms Austin +42K, Nashville +31K, Phoenix +28K net renter inflows in trailing 12 months. Demand fundamentals intact.", tags: ["Demand", "Austin TX", "Nashville TN", "+1"], time: "Yesterday", conf: 91 },
  { tone: "neutral", title: "Rent Growth Normalization Approaching Floor", body: "Effective rent growth YoY at +3.8%, down from +14.6% peak (Q3 2022). Rate of deceleration slowing — likely approaching floor of +3.0–3.5% baseline.", tags: ["Performance", "National"], time: "Yesterday", conf: 65 },
  { tone: "bull", title: "Concession Burn-Off in Class A", body: "Concession packages (free rent, gift cards) declining in 6 of top 10 metros. Net effective rent improvement even as asking rents flat.", tags: ["Performance", "Austin TX", "Dallas TX", "+2"], time: "2 days ago", conf: 82 },
  { tone: "bear", title: "Bridge Debt Maturity Wall Q3–Q4 2025", body: "$32B in floating-rate multifamily debt maturing H2 2025. Refinancing at current rates requires 15–25% equity recapitalization for 2021 vintage acquisitions.", tags: ["Capital", "National"], time: "3 days ago", conf: 88 },
];

// Research page
export const RESEARCH = [
  { cat: "Market Analysis", tags: ["Supply", "National"], title: "Multifamily Supply Cycle: The Case for a 2026–27 Tailwind", date: "May 12, 2025", read: "8 min read" },
  { cat: "Capital Markets", tags: ["Debt", "Risk", "Capital"], title: "The Debt Maturity Wall: What $32B in Floating-Rate Risk Means for Operators", date: "May 8, 2025", read: "12 min read" },
  { cat: "Market Analysis", tags: ["Sun Belt", "Gateway", "Performance"], title: "Sun Belt vs Gateway: A Comparative Performance Review 2020–2025", date: "April 29, 2025", read: "15 min read" },
  { cat: "Demand Analysis", tags: ["Affordability", "Demand", "Macro"], title: "Renter Affordability Ceiling: How High Can Rents Go?", date: "April 15, 2025", read: "10 min read" },
  { cat: "Operations", tags: ["NOI", "Operations", "Performance"], title: "NOI Growth Divergence: Why Same-Store Performance Beats Cap Rate Headlines", date: "March 28, 2025", read: "9 min read" },
];

// Portfolio page
export const PORTFOLIO_STATS = [
  { label: "TOTAL PORTFOLIO VALUE", value: "$166.1M", tone: "signal" },
  { label: "ANNUAL NOI", value: "$9.12M", tone: "bull" },
  { label: "TOTAL UNITS", value: "840", tone: "ink" },
  { label: "AVG OCCUPANCY", value: "92.1%", tone: "signal" },
];

export const PORTFOLIO_ASSETS = [
  { name: "Riverside Commons", grade: "B+", tone: "bull", loc: "Austin, TX", units: 248, value: "$51.2M", gl: "+20.5%", glUp: true, cap: "5.1%", occ: "95.2%", rent: "+4.8%", rentUp: true, noi: 2.6 },
  { name: "Summit Ridge Apts", grade: "B", tone: "bull", loc: "Nashville, TN", units: 184, value: "$33.4M", gl: "+18.9%", glUp: true, cap: "5%", occ: "94.6%", rent: "+4.2%", rentUp: true, noi: 1.8 },
  { name: "Metro 42 Denver", grade: "A-", tone: "neutral", loc: "Denver, CO", units: 312, value: "$71.1M", gl: "+4.9%", glUp: true, cap: "5.3%", occ: "91.4%", rent: "+2.1%", rentUp: true, noi: 3.4 },
  { name: "Lake Shore Place", grade: "C+", tone: "bear", loc: "Chicago, IL", units: 96, value: "$10.4M", gl: "-7.1%", glUp: false, cap: "5.8%", occ: "87.2%", rent: "-1.2%", rentUp: false, noi: 0.5 },
];

// News page (sample headlines — replace with a live curated feed for production)
export const NEWS = [
  { id: 1, title: "Multifamily permits slide for a third straight month as the pipeline thins", source: "Cignal Newsdesk", date: "May 27, 2026", cat: "Supply", excerpt: "Annualized starts fell again to 328K, reinforcing a supply pullback that could tighten occupancy into 2026–27." },
  { id: 2, title: "10-year Treasury eases below 4.3% on a cooler inflation print", source: "Cignal Newsdesk", date: "May 26, 2026", cat: "Capital", excerpt: "A softer CPI read pulled the 10-year lower, narrowing the gap to cap rates and easing refinancing math for some operators." },
  { id: 3, title: "Sun Belt absorption outpaces deliveries in Q1, tightening vacancy", source: "Cignal Newsdesk", date: "May 22, 2026", cat: "Demand", excerpt: "Net absorption ran ahead of new supply across Austin, Nashville, and Phoenix, trimming concessions in Class A." },
  { id: 4, title: "Bridge-loan maturities loom: $30B+ in floating-rate debt due through year-end", source: "Cignal Newsdesk", date: "May 19, 2026", cat: "Capital", excerpt: "2021-vintage acquisitions face recapitalization pressure, opening a window for well-capitalized equity buyers." },
  { id: 5, title: "Renter migration to the Mountain West accelerates, IRS data shows", source: "Cignal Newsdesk", date: "May 14, 2026", cat: "Demand", excerpt: "Denver and Salt Lake City posted elevated net inflows, supporting the demand case in secondary metros." },
  { id: 6, title: "Cap rates stabilize as buyers and sellers narrow the bid-ask gap", source: "Cignal Newsdesk", date: "May 9, 2026", cat: "Capital", excerpt: "Transaction volume ticked up as pricing expectations converged, hinting at a thaw in the investment-sales market." },
];

// Indices page — PLACEHOLDER constituents & values pending the user's ticker lists
// and a live quote feed. Replace members per category; values are illustrative.
export const INDICES = [
  { category: "Home Builders", members: [
    { ticker: "PHM", name: "PulteGroup", price: 118.75, chg: -0.6 },
    { ticker: "DHI", name: "D.R. Horton", price: 152.40, chg: 1.8 },
    { ticker: "LEN", name: "Lennar", price: 138.10, chg: 1.2 },
    { ticker: "TMHC", name: "Taylor Morrison", price: 62.00, chg: 0.9 },
    { ticker: "KBH", name: "KB Home", price: 78.00, chg: -0.4 },
    { ticker: "TOL", name: "Toll Brothers", price: 134.20, chg: 2.1 },
    { ticker: "LGIH", name: "LGI Homes", price: 95.00, chg: -1.2 },
    { ticker: "CCS", name: "Century Communities", price: 85.00, chg: 0.6 },
    { ticker: "NVR", name: "NVR, Inc.", price: 7850.00, chg: 0.9 },
  ]},
  { category: "Home Improvement", members: [
    { ticker: "HD", name: "Home Depot", price: 392.50, chg: 0.4 },
    { ticker: "LOW", name: "Lowe's", price: 248.30, chg: 0.7 },
    { ticker: "FND", name: "Floor & Decor", price: 96.80, chg: -1.1 },
    { ticker: "FAST", name: "Fastenal", price: 79.40, chg: 0.5 },
    { ticker: "BLDR", name: "Builders FirstSource", price: 140.00, chg: 0.6 },
  ]},
  { category: "Lenders", members: [
    { ticker: "PFSI", name: "PennyMac Financial", price: 104.60, chg: 0.8 },
    { ticker: "LFT", name: "Lument Finance Trust", price: 2.40, chg: 0.0 },
    { ticker: "ABR", name: "Arbor Realty Trust", price: 13.50, chg: 0.4 },
    { ticker: "WFC", name: "Wells Fargo", price: 75.00, chg: 0.4 },
    { ticker: "FBRT", name: "Franklin BSP Realty Trust", price: 12.50, chg: 0.2 },
    { ticker: "FNMA", name: "Fannie Mae", price: 8.00, chg: 1.0 },
    { ticker: "FMCC", name: "Freddie Mac", price: 6.00, chg: 1.0 },
  ]},
  { category: "Brokerages", members: [
    { ticker: "CBRE", name: "CBRE Group", price: 128.90, chg: 0.5 },
    { ticker: "JLL", name: "Jones Lang LaSalle", price: 265.40, chg: -0.3 },
    { ticker: "COMP", name: "Compass", price: 6.80, chg: 3.2 },
    { ticker: "EXPI", name: "eXp World Holdings", price: 11.25, chg: -0.9 },
    { ticker: "CWK", name: "Cushman & Wakefield", price: 11.50, chg: 0.3 },
    { ticker: "MMI", name: "Marcus & Millichap", price: 33.00, chg: -0.5 },
    { ticker: "WD", name: "Walker & Dunlop", price: 90.00, chg: 0.8 },
  ]},
  { category: "Commercial Real Estate Services", members: [
    { ticker: "CBRE", name: "CBRE Group", price: 128.90, chg: 0.5 },
    { ticker: "JLL", name: "Jones Lang LaSalle", price: 265.40, chg: -0.3 },
    { ticker: "CWK", name: "Cushman & Wakefield", price: 11.50, chg: 0.3 },
    { ticker: "CIGI", name: "Colliers International", price: 145.00, chg: 0.6 },
    { ticker: "NMRK", name: "Newmark Group", price: 13.20, chg: 1.1 },
  ]},
  { category: "Residential REITs and Operators", members: [
    { ticker: "EQR", name: "Equity Residential", price: 70.50, chg: 0.4 },
    { ticker: "CPT", name: "Camden Property Trust", price: 115.20, chg: -0.2 },
    { ticker: "ESS", name: "Essex Property Trust", price: 290.40, chg: 0.7 },
    { ticker: "AVB", name: "AvalonBay Communities", price: 215.80, chg: 0.5 },
    { ticker: "MAA", name: "Mid-America Apartment Communities", price: 150.30, chg: 0.3 },
    { ticker: "UDR", name: "UDR, Inc.", price: 42.10, chg: -0.1 },
    { ticker: "IRT", name: "Independence Realty Trust", price: 19.40, chg: 0.6 },
    { ticker: "NXRT", name: "NexPoint Residential Trust", price: 38.20, chg: 0.9 },
  ]},
];

// Home-page copy (vertical-specific). audiences icon keys map to lucide icons in the page.
export const COPY = {
  heroKicker: "Market Intelligence · Multifamily Real Estate",
  heroAsset: "multifamily real estate",
  heroLead: "The science of multifamily real estate investing — market intelligence for operators, investors, and management firms.",
  whoHeadline: "Built for the people who live inside the multifamily cycle.",
  whoLead:
    "Cignal System is market intelligence for multifamily real estate — it turns the economic data that moves rents, occupancy, and values into a clear read on where the cycle is headed. If you own, operate, invest in, or manage apartments, it's built for you.",
  audiences: [
    { icon: "Building2", name: "Owners", desc: "Time acquisitions, refinances, and dispositions to the cycle — not the headlines." },
    { icon: "SlidersHorizontal", name: "Operators", desc: "See where rents, occupancy, and concessions are heading before they hit your P&L." },
    { icon: "TrendingUp", name: "Investors", desc: "Underwrite with leading indicators and spot the markets turning first." },
    { icon: "Users", name: "Management Firms", desc: "Give every property a cycle-aware read to guide pricing and strategy." },
  ],
  dashLead: "Real-time leading & trailing economic indicators for multifamily real estate.",
  marketMetricA: "Rent",
  marketMetricB: "Vac",
  aboutAsset: "multifamily real estate",
  founderRole: "a multifamily operator and market-cycle researcher",
  cycleMetric: "OCCUPANCY",
  cyclePhases: ["Occupancy rising", "Demand > supply", "Supply > demand", "Occupancy falling"],
  mmSubtitle: "Multifamily fundamentals scored and ranked across top U.S. metros.",
  mmMetrics: ["Rent Growth", "Vacancy", "Cap Rate", "NOI Growth"],
  fcSubtitle: "5-year forward projections for multifamily fundamentals across leading indicators.",
  fcMetrics: ["Rent Growth", "Vacancy", "Cap Rate", "NOI Growth"],
  fcColLabel: "RENT",
  pfSubtitle: "Monitor your multifamily assets against live market signals.",
  pfChartTitle: "NOI by Asset ($M)",
  footerTagline: "Military Grade Economic Intelligence for Multifamily Real Estate Owners, Operators, Investors and Property Management Teams.",
};
