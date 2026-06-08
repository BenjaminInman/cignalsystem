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
  { cat: "PERFORMANCE", name: "Effective Rent Growth", value: "+3.8%", delta: "-0.2%", dir: "down", tone: "neutral", note: "Stabilizing after normalization from peak", series: up1 },
  { cat: "CAPITAL", name: "Cap Rate (National Avg)", value: "5.15%", delta: "+12bps", dir: "down", tone: "bear", note: "Expanding for 6 quarters — repricing underway", series: up1 },
  { cat: "CAPITAL", name: "Debt Service Coverage", value: "1.28x", delta: "-0.04", dir: "down", tone: "neutral", note: "Compression from higher rates on floating debt", series: down1 },
];

export const TOP_MARKETS = [
  { city: "Austin, TX", score: 88, rent: "+5.1%", vac: "4.1%", tone: "bull" },
  { city: "Nashville, TN", score: 84, rent: "+4.7%", vac: "4.4%", tone: "bull" },
  { city: "Phoenix, AZ", score: 76, rent: "+3.2%", vac: "5.8%", tone: "bull" },
  { city: "Denver, CO", score: 71, rent: "+2.4%", vac: "6.1%", tone: "neutral" },
  { city: "San Francisco, CA", score: 52, rent: "+0.8%", vac: "7.2%", tone: "neutral" },
  { city: "Chicago, IL", score: 45, rent: "-0.3%", vac: "8.1%", tone: "bear" },
];

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
  { cat: "PERFORMANCE", type: "TRAILING", name: "Effective Rent Growth", value: "+3.8%", unit: "YoY", change: "-0.2% from prior period", note: "Stabilizing after normalization from peak", tone: "neutral",
    measures: "Year-over-year change in net effective rents — realized pricing power after concessions.",
    impact: "Moderating growth signals normalization; underwrite to sustainable, not peak, rent trends.",
    trend: [7.2, 6.5, 5.8, 5.1, 4.6, 4.2, 4.0, 3.9, 3.8] },
  { cat: "CAPITAL", type: "TRAILING", name: "Cap Rate (National Avg)", value: "5.15%", unit: "blended", change: "+12bps QoQ", note: "Expanding for 6 quarters", tone: "bear",
    measures: "Blended national cap rate. Rising cap rates compress values as buyers demand higher yields.",
    impact: "Expansion pressures valuations — favorable for buyers, a headwind for sellers and refinancings.",
    trend: [4.4, 4.55, 4.7, 4.8, 4.9, 5.0, 5.05, 5.1, 5.15] },
  { cat: "MACRO", type: "LEADING", name: "Renter-Age Employment (18-34)", value: "+1.9%", unit: "YoY", change: "+0.1% MoM", note: "Steady uptrend for 12 months", tone: "bull",
    measures: "Employment growth among prime renter-age cohorts — a leading driver of household formation and rental demand.",
    impact: "Steady job gains in this cohort underpin demand and new-renter formation.",
    trend: [1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.85, 1.9] },
];

// Market Maps page
export const MARKET_GROUPS = [
  {
    region: "SUN BELT",
    markets: [
      { city: "Austin, TX", rent: "+5.1%", vac: "4.1%", cap: "4.9%", noi: "+6.2%", score: 88, tone: "bull" },
      { city: "Nashville, TN", rent: "+4.7%", vac: "4.4%", cap: "5.0%", noi: "+5.8%", score: 84, tone: "bull" },
      { city: "Phoenix, AZ", rent: "+3.2%", vac: "5.8%", cap: "5.2%", noi: "+4.1%", score: 76, tone: "bull" },
      { city: "Dallas, TX", rent: "+2.8%", vac: "6.2%", cap: "5.3%", noi: "+3.9%", score: 74, tone: "neutral" },
      { city: "Atlanta, GA", rent: "+3.8%", vac: "5.1%", cap: "5.1%", noi: "+4.9%", score: 79, tone: "bull" },
    ],
  },
  {
    region: "MOUNTAIN WEST",
    markets: [
      { city: "Denver, CO", rent: "+2.4%", vac: "6.1%", cap: "5.3%", noi: "+3.2%", score: 71, tone: "neutral" },
      { city: "Salt Lake City, UT", rent: "+3.5%", vac: "5.0%", cap: "5.0%", noi: "+4.5%", score: 77, tone: "bull" },
    ],
  },
  {
    region: "GATEWAY",
    markets: [
      { city: "New York, NY", rent: "+1.8%", vac: "4.2%", cap: "4.5%", noi: "+2.5%", score: 63, tone: "neutral" },
      { city: "San Francisco, CA", rent: "+0.8%", vac: "7.2%", cap: "5.5%", noi: "+1.2%", score: 52, tone: "neutral" },
      { city: "Chicago, IL", rent: "-0.3%", vac: "8.1%", cap: "5.8%", noi: "-0.5%", score: 45, tone: "bear" },
    ],
  },
];

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
];

// Home-page copy (vertical-specific). audiences icon keys map to lucide icons in the page.
export const COPY = {
  heroKicker: "Market Intelligence · Multifamily Real Estate",
  heroAsset: "multifamily real estate",
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
};
