// All figures are illustrative sample data for layout/demo purposes.
// Replace with live feeds (FRED, Census, Treasury, ATTOM, etc.) for production.

export const TICKER = [
  { label: "AVG RENT GROWTH", value: "+3.8% YoY", delta: "+0.2%", dir: "up" },
  { label: "CAP RATE (NATAVG)", value: "5.60%", delta: "", dir: "down" },
  { label: "10Y TREASURY", value: "4.42%", delta: "-8bps", dir: "up" },
  { label: "MULTIFAMILY STARTS", value: "328K", delta: "-6.1%", dir: "down" },
  { label: "ABSORPTION RATE", value: "46.8%", delta: "4-qtr avg", dir: "up" },
  { label: "EMPLOYMENT GROWTH", value: "+1.9%", delta: "+0.1%", dir: "up" },
  { label: "CPI SHELTER", value: "+5.1%", delta: "-0.4%", dir: "down" },
  { label: "NATIONAL VACANCY", value: "5.2%", delta: "-0.3%", dir: "up" },
  // Apartment List time-on-market. Deliberately NOT "DAYS ON MARKET": that name
  // collides with the Realtor.com for-sale series on the Indicators tab, which
  // measures a different market. The label must also match the key emitted by
  // lib/ticker.js — when it didn't, the override was orphaned and this row
  // silently rendered its static sample forever.
  { label: "APT DAYS TO LEASE", value: "30 days", delta: "-2.0", dir: "up" },
];

export const COMPOSITE = { label: "BULLISH", confidence: 60, tone: "bull" };

// Home page stats strip. Labels and units only — the numbers come from
// platform_stats() and nowhere else. This previously carried hard-coded values
// ("393 MSAs", "1.4MM+") that rendered whenever /api/stats failed, which is
// exactly what happened when the RPC started timing out: the page confidently
// understated the warehouse by 2.6x with no sign anything was wrong. A dash is
// the honest answer when the feed is down.
export const DASH_STATS = [
  { label: "INDICATORS TRACKED", value: "—", unit: "live", tone: "signal" },
  { label: "MULTIFAMILY MARKETS", value: "—", unit: "metros", tone: "ink" },
  { label: "ZIP CODES", value: "—", unit: "tracked", tone: "ink" },
  { label: "DATA POINTS", value: "—", unit: "live", tone: "signal" },
];

// sparkline series (just relative points)
const up1 = [3, 3.2, 3.1, 3.4, 3.6, 3.8, 4.0];
const down1 = [5, 4.6, 4.8, 4.4, 4.5, 4.2, 4.1];

export const LEADING_CARDS = [
  { cat: "SUPPLY", name: "Multifamily Permit Activity", value: "328K", delta: "-6.1%", dir: "down", tone: "bear", note: "Annualized starts declining — supply pressure easing", series: down1 },
  { cat: "DEMAND", name: "Absorption Rate (3-Mo)", value: "46.8%", delta: "-8.5pp", dir: "down", tone: "bear", note: "4-qtr avg vs 55.3% normal \u2014 new supply leasing slowly", series: down1 },
  { cat: "MACRO", name: "Renter-Age Employment", value: "+1.9%", delta: "+0.1%", dir: "up", tone: "bull", note: "18–34 cohort employment holding steady, fueling demand", series: up1 },
  { cat: "DEMAND", name: "Net Renter Migration Index", value: "112", delta: "+4pts", dir: "up", tone: "bull", note: "Sun Belt & Mountain West seeing elevated in-migration", series: up1 },
];

export const TRAILING_CARDS = [
  { cat: "PERFORMANCE", name: "National Vacancy Rate", value: "5.2%", delta: "-0.3%", dir: "up", tone: "bull", note: "Declining for 18 months — fundamentals tightening", series: down1 },
  { cat: "PERFORMANCE", name: "Market Rent Growth", value: "+3.8%", delta: "-0.2%", dir: "down", tone: "neutral", note: "Stabilizing after normalization from peak", series: up1 },
  { cat: "CAPITAL", name: "Cap Rate (National Avg)", value: "5.60%", delta: "+17bps", dir: "down", tone: "bear", note: "Expanding for 6 quarters — repricing underway", series: up1 },
  { cat: "CAPITAL", name: "Debt Service Coverage", value: "1.28x", delta: "-0.04", dir: "down", tone: "neutral", note: "Compression from higher rates on floating debt", series: down1 },
];

// TOP_MARKETS is derived from MARKET_GROUPS further below (top 6 by score) so the
// home page's Top Markets box always matches the Market Maps page exactly.

// Indicators page
export const INDICATORS = [
  { cat: "DEMAND", type: "TRAILING", name: "Days to Lease (Apartments)", value: "30", unit: "median days", change: "-0.4 days MoM", note: "Apartment List — how long a UNIT sits before lease", tone: "bull",
    measures: "Median days an apartment listing sits before it is leased (Apartment List). This is the rental market's velocity — the direct counterpart to days-on-market for homes, and not the same measurement. Read the two together: one is your market, the other is the alternative your renters are weighing.",
    impact: "Fewer days to lease means demand is absorbing supply and you have pricing power at renewal. Rising days is the first operational sign of slack — it shows up here before it shows up in vacancy or in rents.",
    trend: [31.2, 30.9, 30.7, 30.3] },
  { cat: "CAPITAL", type: "LEADING", name: "Apartment Investment Index (AIMI)", value: "104.2", unit: "Freddie Mac, index", change: "+1.1 QoQ", note: "Relative value of buying apartments today", tone: "neutral",
    measures: "Freddie Mac's Apartment Investment Market Index — it combines NOI growth, property prices and mortgage rates into one read on how attractive it is to invest in apartments right now versus history. Rising means the math is improving for buyers.",
    impact: "This is the closest thing to an official 'is now a good time to buy' gauge for multifamily, published by the largest lender in the space. Read it against your own underwriting rather than as a verdict.",
    trend: [101.8, 102.4, 103.1, 104.2] },
  { cat: "PERFORMANCE", type: "TRAILING", name: "AIMI Rent Component", value: "—", unit: "Freddie Mac, index", change: "—", note: "NOI growth inside AIMI", tone: "neutral",
    measures: "The net-operating-income leg of Freddie Mac's AIMI. Isolating it shows how much of the investment case is coming from property income growth rather than from prices or debt costs.",
    impact: "When AIMI improves on the rent leg, the case is built on real income. When it improves only because rates fell, the case is built on financing — a far more fragile foundation.",
    trend: [] },
  { cat: "PERFORMANCE", type: "TRAILING", name: "AIMI Value Component", value: "—", unit: "Freddie Mac, index", change: "—", note: "Property prices inside AIMI", tone: "neutral",
    measures: "The property-price leg of Freddie Mac's AIMI. Rising values push AIMI down (you pay more per dollar of income); falling values push it up.",
    impact: "Read alongside the rent component to see whether the investment case rests on income or on price — the difference between durable and borrowed returns.",
    trend: [] },
  { cat: "DEMAND", type: "COINCIDENT", name: "Existing Home Sales", value: "—", unit: "annualized", change: "—", note: "For-sale market throughput", tone: "neutral",
    measures: "Annualized pace of existing home sales. It reads the for-sale market's health — the alternative your renters are weighing against staying put.",
    impact: "Weak resale volume means would-be buyers stay renters, supporting apartment demand. A thaw in sales pulls the top of your renter pool toward ownership.",
    trend: [] },
  { cat: "PERFORMANCE", type: "TRAILING", name: "Rent Burden", value: "—", unit: "renters >30% of income", change: "—", note: "Census ACS — affordability ceiling", tone: "neutral",
    measures: "Share of renter households spending more than 30% of income on rent — the federal definition of cost-burdened. Annual, from the Census American Community Survey, back to 2010.",
    impact: "The ceiling on rent growth. When burden is already high, further increases meet resistance in delinquency and move-outs rather than in collections. It is the demand-side limit your pro forma has to respect.",
    trend: [] },
  { cat: "PERFORMANCE", type: "TRAILING", name: "Median Gross Rent", value: "—", unit: "Census ACS, monthly", change: "—", note: "Rent incl. utilities, all renters", tone: "neutral",
    measures: "Median gross rent — contract rent plus utilities — across all renter households nationally. Census ACS, annual, back to 2010. Unlike listing-based indices, this reflects what renters in place actually pay, not what is being asked of new movers.",
    impact: "The slow, honest baseline under the faster listing indices. ZORI tells you where the market is pricing; this tells you where the stock actually sits.",
    trend: [] },
  { cat: "MACRO", type: "TRAILING", name: "Median Household Income", group: "macro", value: "—", unit: "Census ACS, annual", change: "—", note: "Affordability denominator", tone: "neutral",
    measures: "Median household income nationally, from the Census ACS, back to 2010. This is the denominator in every affordability calculation that matters.",
    impact: "Rent growth that outruns income growth is borrowed from the future. Track the gap between this and rent to see how much room the market really has.",
    trend: [] },
  { cat: "PERFORMANCE", type: "TRAILING", name: "Median Home Value", value: "—", unit: "Census ACS", change: "—", note: "Rent-vs-buy reference", tone: "neutral",
    measures: "Median owner-occupied home value from the Census ACS, annual, back to 2010. A slower, survey-based counterpart to Zillow's ZHVI.",
    impact: "Sets the rent-versus-buy tradeoff your renters face. When values and mortgage rates put ownership out of reach, your renter pool deepens at the top.",
    trend: [] },
  { cat: "DEMAND", type: "TRAILING", name: "Rentership Rate", value: "—", unit: "of occupied units", change: "—", note: "Census ACS — renter share of households", tone: "neutral",
    measures: "Share of occupied housing units that are renter-occupied, computed from Census ACS renter-occupied and occupied-unit counts, annual back to 2010. The structural size of the renter pool.",
    impact: "The tide under multifamily demand. A rising rentership rate means the renter pool is structurally growing — the single most durable demand signal there is, though it moves slowly.",
    trend: [] },
  { cat: "CAPITAL", type: "LEADING", name: "2-Year Treasury", value: "4.26%", unit: "DGS2", change: "+0.05pp", note: "Market's read on Fed policy", tone: "neutral",
    measures: "The 2-year Treasury yield — the market's expectation for where the Fed sets rates over the next two years. It moves ahead of the Fed, not after it: the 2Y reprices the moment expectations shift, while the funds rate only catches up at meetings.",
    impact: "Sets the cost of short-term and floating debt, bridge loans and rate caps. A falling 2Y is the first sign refinancing pressure is about to ease; a rising one tightens the screws before any official hike.",
    trend: [4.21, 4.16, 4.21, 4.26] },
  { cat: "CAPITAL", type: "LEADING", name: "Corporate Credit Spread (BAA)", group: "macro", value: "1.56pp", unit: "BAA minus 10Y", change: "-0.02pp", note: "Investment-grade risk premium", tone: "bull",
    measures: "What investors demand to hold BAA-rated corporate debt over risk-free Treasuries. It is a direct read on the price of credit risk — narrow when capital is confident, wide when it retreats to safety.",
    impact: "Credit spreads lead lending conditions. Widening spreads mean debt gets pricier and harder to source across the board, including multifamily — usually before lenders formally tighten.",
    trend: [1.56, 1.56, 1.58, 1.56] },
  { cat: "CAPITAL", type: "LEADING", name: "High-Yield Credit Spread", group: "macro", value: "2.69pp", unit: "ICE BofA HY OAS", change: "-0.01pp", note: "Risk appetite, earliest stress read", tone: "bull",
    measures: "The option-adjusted spread on high-yield corporate bonds — the premium demanded to hold the riskiest credit. This is the most sensitive capital-markets gauge there is: it moves first when risk appetite turns.",
    impact: "The earliest warning that capital is repricing risk. HY spreads blow out before recessions and before CRE lending seizes; a calm HY market means the debt window is open.",
    trend: [2.70, 2.70, 2.69, 2.69] },
  { cat: "CAPITAL", type: "LEADING", name: "SOFR (Overnight Rate)", value: "3.63%", unit: "secured overnight", change: "+0.03pp", note: "Floating-rate debt benchmark", tone: "neutral",
    measures: "The Secured Overnight Financing Rate — the benchmark that floating-rate multifamily debt actually prices off since LIBOR's retirement. It is the real cost of overnight money.",
    impact: "Every floating-rate loan and rate cap in your stack keys off this. SOFR falling relieves debt service on bridge and construction paper directly; rising SOFR raises cap replacement costs at renewal.",
    trend: [3.53, 3.55, 3.60, 3.63] },
  { cat: "CAPITAL", type: "LEADING", name: "MF Lending Standards (SLOOS)", value: "0", unit: "net % tightening", change: "+5.5pts", note: "Fed survey — multifamily credit spigot", tone: "neutral",
    measures: "The Fed's Senior Loan Officer Survey: the net share of banks tightening standards on multifamily loans. Positive means more banks tightening than easing; negative means credit is loosening. Quarterly, and it comes straight from the lenders themselves.",
    impact: "This is the credit spigot for your asset class specifically. Tightening standards choke acquisition and construction financing quarters before it shows in transaction volume — one of the truest leading reads on capital availability.",
    trend: [4.8, 1.6, -5.5, 0] },
  { cat: "MACRO", type: "LEADING", name: "Job Openings (JOLTS)", group: "macro", value: "7,594K", unit: "openings", change: "+9K MoM", note: "Labor demand, ahead of payrolls", tone: "bull",
    measures: "Total unfilled job openings across the economy. Openings are employers' forward intent — they signal hiring before it becomes payrolls, which makes this a genuine leading read on the labor market that drives renter demand.",
    impact: "Jobs make households and households rent apartments. Falling openings flag softening household formation and absorption 6-12 months out, well before the unemployment rate moves.",
    trend: [6922, 6887, 7585, 7594] },
  { cat: "MACRO", type: "LEADING", name: "Quits Rate (JOLTS)", group: "macro", value: "1.9%", unit: "of employment", change: "flat MoM", note: "Worker confidence gauge", tone: "neutral",
    measures: "The share of workers voluntarily quitting each month. People only quit when they believe a better job is waiting — so the quits rate is a clean read on how confident workers feel, uncontaminated by layoffs.",
    impact: "A falling quits rate means workers are hunkering down: fewer moves, fewer new leases, less household formation. It is a behavioral signal that leads both wage growth and renter mobility.",
    trend: [1.9, 2.0, 1.9, 1.9] },
  { cat: "SUPPLY", type: "LEADING", name: "Multifamily Building Permits", value: "328K", unit: "annualized", change: "-6.1% MoM", note: "Declining for 3 consecutive months", tone: "bear",
    measures: "Forward-looking supply gauge. Falling permits reduce future inventory pressure and support rent growth in 18–24 months.",
    impact: "Positive for existing owners — fewer units competing for renters.",
    trend: [420, 408, 398, 388, 375, 360, 345, 330, 318] },
  { cat: "PERFORMANCE", type: "TRAILING", name: "Home Value Index", value: "+1.2%", unit: "ZHVI, YoY", change: "+0.1% MoM", note: "Zillow national home values", tone: "neutral",
    measures: "National home-value appreciation (Zillow ZHVI). A coincident read on owner equity, refinancing capacity and for-sale conditions that cross-checks the rent cycle and affordability.",
    impact: "Falling home values pressure refinancings, valuations and cap rates; rising values build equity but worsen affordability.",
    trend: [2.0, 1.8, 1.6, 1.5, 1.4, 1.3, 1.3, 1.2, 1.2] },
  { cat: "DEMAND", type: "COINCIDENT", name: "Renter Demand Index (ZORDI)", value: "-5", unit: "pts YoY", change: "+8 vs prior mo", note: "Zillow rental-market tightness", tone: "bear",
    measures: "Rental-market tightness — renter engagement with Zillow listings, measured against available supply. Despite the name, Zillow describes it as a tightness gauge rather than pure demand: a high reading means renters are competing for units, a low reading means units are competing for renters. Directional index with no natural units; read the trend, not the level.",
    impact: "Tracks vacancy almost one-for-one and about a month ahead of time-on-market, so it is a fast confirmation of market slack rather than an early warning. Its value is timeliness: it is monthly and current, where vacancy is quarterly and revised.",
    trend: [51, 45, 38, 33, 30, 28, 27, 29, 31, 34, 35, 36, 36] },
  { cat: "DEMAND", type: "LEADING", name: "Absorption Rate (3-Mo)", value: "46.8%", unit: "4-qtr avg", sub: "latest print 49% \u00b7 Q4 2025", change: "-8.5pp vs normal", note: "New apartments leased within 3 months of completion \u2014 Census SOMA. Normal \u2248 55.3%; below 50% is supply stress.", tone: "bear",
    measures: "Demand gauge \u2014 the share of newly delivered units leased within three months of completion. The raw quarterly print is strongly seasonal (Q2 averages 59.1%, Q4 51.3% \u2014 a swing as large as the entire series' standard deviation), so the headline and its color come from the trailing four-quarter average, where seasonality cancels. The latest raw print is shown alongside it.",
    impact: "Pre-2020 the trailing average held 55.3% with a standard deviation of just 1.91pp, and never once fell below 50%. Today's 46.8% is roughly 4.4 standard deviations below that norm \u2014 new supply is leasing far more slowly than in any normal quarter on record, which pressures concessions, occupancy and pricing power.",
    trend: [57, 61, 52, 41, 49, 50, 48, 42, 47, 43, 48, 49] },
  { cat: "DEMAND", type: "LEADING", name: "Days On Market (For-Sale Homes)", value: "52", unit: "median days", change: "+3 days MoM", note: "Realtor.com — how long a HOME sits before contract", tone: "bear",
    measures: "How long for-sale homes sit before going under contract. Rising days-on-market signals cooling demand and more buyer leverage — an early read on housing-market momentum.",
    impact: "Lengthening days-on-market is an early demand-softening signal; watch it alongside absorption and rent growth for cycle turns.",
    trend: [38, 40, 44, 48, 50, 53, 55, 54, 52] },
  { cat: "PERFORMANCE", type: "TRAILING", name: "National Vacancy Rate", value: "5.2%", unit: "national avg", change: "-0.3% YoY", note: "Declining for 18 months", tone: "bull",
    measures: "Trailing measure of unoccupied units nationally. Falling vacancy tightens the market and strengthens landlord leverage.",
    impact: "Lower vacancy supports rent growth and steadier cash flow for owners.",
    trend: [5.9, 5.8, 5.7, 5.6, 5.5, 5.45, 5.35, 5.28, 5.2] },
  { cat: "PERFORMANCE", type: "TRAILING", name: "Market Rent Growth (All Rentals)", value: "+3.8%", unit: "YoY", change: "-0.2% from prior period", note: "Stabilizing after normalization from peak", tone: "neutral",
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
  { cat: "CAPITAL", type: "TRAILING", name: "Cap Rate (National Avg)", value: "5.60%", unit: "blended", change: "+17bps QoQ", note: "Expanding for 6 quarters", tone: "bear",
    measures: "Blended national cap rate. Rising cap rates compress values as buyers demand higher yields.",
    impact: "Expansion pressures valuations — favorable for buyers, a headwind for sellers and refinancings.",
    trend: [4.7, 4.85, 5.0, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6] },
  { cat: "MACRO", type: "LEADING", name: "Renter-Age Employment (20-34)", value: "+1.9%", unit: "YoY", change: "+0.1% MoM", note: "Steady uptrend for 12 months", tone: "bull",
    measures: "Employment growth among prime renter-age cohorts — a leading driver of household formation and rental demand.",
    impact: "Steady job gains in this cohort underpin demand and new-renter formation.",
    trend: [1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.85, 1.9] },
  { cat: "MACRO", type: "LEADING", name: "Wage Growth", group: "macro", value: "+4.1%", unit: "YoY", change: "-0.1% MoM", note: "Cooling toward the pre-pandemic norm", tone: "neutral",
    measures: "Year-over-year growth in worker pay. Wages set the ceiling on what renters can afford and underpin demand for housing.",
    impact: "Steady wage gains support rent-growth potential and lease-up; rapid deceleration warns of softening demand and affordability stress.",
    trend: [5.4, 5.1, 4.9, 4.7, 4.5, 4.4, 4.3, 4.2, 4.1] },
  { cat: "MACRO", type: "LEADING", name: "Real Wage Growth", group: "macro", value: "-0.8%", unit: "YoY", change: "-0.5pp MoM", note: "Turned negative \u2014 pay is losing to prices", tone: "bear",
    measures: "Year-over-year growth in worker pay after inflation \u2014 average hourly earnings of all employees, total private, in constant 1982-84 dollars (BLS deflates with CPI-U). Same universe and seasonal adjustment as nominal Wage Growth, so the two read as a matched pair.",
    impact: "This is the honest read on rent-paying capacity. Nominal wages can climb while real wages fall, and when they do, renters absorb the gap through rent-to-income stress, doubling up, and delinquency \u2014 pressure that shows up in collections long before it shows up in vacancy. When real turns negative while nominal still looks healthy, the nominal number is telling you a story inflation already ended.",
    trend: [1.0, 1.2, 1.1, 1.0, 1.3, 1.3, 0.2, -0.3, -0.8] },
  { cat: "MACRO", type: "LEADING", name: "Job Growth", group: "macro", value: "+165K", unit: "nonfarm, MoM", change: "-12K vs prior", note: "Steady but moderating hiring", tone: "bull",
    measures: "Net new payroll jobs added each month — the primary engine of household formation and rental demand.",
    impact: "Sustained hiring drives new-renter formation and absorption; a hiring slowdown is an early demand-softening signal.",
    trend: [225, 210, 198, 188, 182, 176, 172, 168, 165] },

  // ---- Added to complete the master list -----------------------------------
  // The Indicators tab is the master list: anything the platform displays
  // anywhere -- ticker, cycle wheel, dashboard donuts -- must have a row here.
  // These thirteen were live on other surfaces (or sitting in the warehouse
  // fully populated) with no entry on this page. The 10-Year Treasury was the
  // starkest: on the ticker AND the dashboard donut, the single most important
  // rate in real estate, while the 2-Year had a row and it did not.
  { cat: "SUPPLY", type: "LEADING", name: "Multifamily Starts", group: "re", value: "513K", unit: "5+ units, SAAR", change: "", note: "Census housing starts, 5+ unit structures", tone: "neutral",
    measures: "Multifamily units on which construction actually began, annualized. Permits are intent; starts are commitment — the point at which capital is committed and the unit is coming whether the market still wants it or not.",
    impact: "Starts set your competitive supply 18–24 months out. A starts surge today is the rent pressure you will be absorbing two years from now, which is exactly the lag that makes it a leading indicator worth watching." },
  { cat: "SUPPLY", type: "LEADING", name: "Housing Starts (Total)", group: "re", value: "1.31M", unit: "all units, SAAR", change: "", note: "Census total housing starts", tone: "neutral",
    measures: "All residential construction starts, single-family and multifamily combined, annualized.",
    impact: "The broadest read on construction activity. Read it against multifamily starts specifically — when the two diverge, capital is rotating between for-sale and for-rent product." },
  { cat: "SUPPLY", type: "LEADING", name: "Building Permits (Total)", group: "re", value: "1.28M", unit: "all units, SAAR", change: "", note: "Census total building permits", tone: "neutral",
    measures: "All residential permits issued, annualized — the earliest formal signal in the construction pipeline.",
    impact: "The leading edge of supply. Permits lead starts, starts lead completions, completions lead the vacancy you compete against." },
  { cat: "SUPPLY", type: "COINCIDENT", name: "Housing Completions", group: "re", value: "1.42M", unit: "all units, SAAR", change: "", note: "Census housing completions", tone: "neutral",
    measures: "Units finished and ready for occupancy, annualized. The end of the pipeline that began with permits roughly two years earlier.",
    impact: "Completions are supply arriving now — the deliveries actually competing for your renters this quarter. When completions run hot into softening demand, that is the Hypersupply phase in real time." },

  { cat: "PERFORMANCE", type: "TRAILING", name: "Apartment Rent Estimate", group: "re", value: "$1,396", unit: "Apartment List, national", change: "", note: "Apartment List national rent estimate", tone: "neutral",
    measures: "Median asking rent across Apartment List's national inventory. An independent read alongside Zillow's ZORI, built from a different panel and methodology.",
    impact: "Two independent rent series that disagree is information. When Apartment List and ZORI diverge, the gap usually points to a mix shift — different unit classes or geographies moving at different speeds." },
  { cat: "PERFORMANCE", type: "TRAILING", name: "Apartment Vacancy Index", group: "re", value: "6.9%", unit: "Apartment List", change: "", note: "Apartment List vacancy index", tone: "neutral",
    measures: "Share of units sitting vacant across Apartment List's national panel.",
    impact: "Read beside the Census rental vacancy rate — two constructs measuring the same thing from different panels, which is why they are kept as separate attributed series rather than averaged." },

  { cat: "DEMAND", type: "TRAILING", name: "Homeownership Rate", group: "re", value: "65.1%", unit: "Census, quarterly", change: "", note: "Census homeownership rate", tone: "neutral",
    measures: "Share of occupied housing units owned rather than rented.",
    impact: "The direct inverse of your addressable market. Every point of homeownership decline pushes households into the rental pool; every point of increase pulls them out. It moves slowly, which is what makes a turn meaningful." },

  { cat: "DEMAND", type: "LEADING", name: "New Home Sales", group: "re", value: "651K", unit: "SAAR", change: "", note: "Census new single-family home sales", tone: "neutral",
    measures: "Newly built single-family homes sold, annualized.",
    impact: "A leading read on for-sale demand and, indirectly, on renter retention — when for-sale transactions stall, would-be buyers stay renters." },
  { cat: "DEMAND", type: "LEADING", name: "Months' Supply of Homes", group: "re", value: "9.8", unit: "months at current pace", change: "", note: "Census months' supply of new homes", tone: "neutral",
    measures: "How long existing for-sale inventory would last at the current sales pace. Roughly six months is considered balanced.",
    impact: "Rising months' supply is the earliest sign the for-sale market is loosening. Sustained readings above six point to price softness ahead, which reshapes the rent-versus-buy calculus your renters are running." },
  { cat: "PERFORMANCE", type: "TRAILING", name: "Case-Shiller Home Price Index", group: "re", value: "331.9", unit: "index, national", change: "", note: "S&P CoreLogic Case-Shiller national index", tone: "neutral",
    measures: "Repeat-sales home price index — the benchmark measure of US house prices, built by tracking the same homes across successive sales.",
    impact: "The repeat-sales method controls for mix, which makes it the cleanest read on real price movement. Read against Zillow's ZHVI: same construct, different method, and their disagreements are informative." },

  { cat: "CAPITAL", type: "LEADING", name: "10-Year Treasury", group: "re", value: "4.55%", unit: "DGS10", change: "", note: "10-Year Treasury constant maturity", tone: "neutral",
    measures: "The yield on 10-year US government debt — the risk-free benchmark that permanent real-estate debt is priced against.",
    impact: "The single most important rate in commercial real estate. It sets the floor under mortgage rates and anchors cap rates; when the 10-Year moves, valuations reprice whether or not anything about the property changed." },
  { cat: "CAPITAL", type: "LEADING", name: "30-Year Mortgage Rate", group: "re", value: "6.7%", unit: "Freddie Mac PMMS", change: "", note: "Freddie Mac 30-year fixed survey rate", tone: "neutral",
    measures: "The average 30-year fixed mortgage rate from Freddie Mac's weekly survey.",
    impact: "Governs the rent-versus-buy decision for every household in your market. High mortgage rates lock would-be buyers into renting — supporting demand — while simultaneously raising the debt cost on your own acquisitions." },

  { cat: "MACRO", type: "TRAILING", name: "CPI Shelter", group: "macro", value: "+3.3%", unit: "CPI shelter, YoY", change: "", note: "CPI shelter component (BLS)", tone: "neutral",
    measures: "The shelter component of CPI — roughly a third of the headline basket, and the largest single line in it.",
    impact: "The bridge between your asset class and national inflation policy. Shelter CPI lags market rents by 9–12 months by construction, so today's market rents are telling you where this print goes next — and it is heavy enough to move the Fed on its own." },
  { cat: "MACRO", type: "TRAILING", name: "Unemployment Rate", group: "macro", value: "4.2%", unit: "U-3, SA", change: "-0.1pp YoY", note: "Within the healthy 2.5\u20134.5% band", tone: "bull",
    measures: "Share of the labor force actively seeking work (U-3, seasonally adjusted). Where Job Growth counts jobs added, this measures slack in the labor market \u2014 the two can diverge, and unemployment is the cleaner read on how much cushion the economy has left.",
    impact: "A trailing confirmation, not an early warning: unemployment turns after hiring does. Rising unemployment erodes household formation and rent-paying capacity, and pushes renters toward doubling up. Sustained readings above 5% have historically coincided with rent-growth stalls and rising delinquency.",
    trend: [3.9, 4.0, 4.1, 4.2, 4.3, 4.3, 4.3, 4.3, 4.2] },
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
  { cat: "MACRO", type: "TRAILING", name: "CPI (All Urban)", group: "macro", value: "+2.9%", unit: "CPI YoY", change: "-0.1% MoM", note: "Grinding toward the 2% target", tone: "neutral",
    measures: "The year-over-year change in consumer prices (CPI, all urban consumers). The headline inflation print the market reacts to, and the index most leases and escalators reference.",
    impact: "Cooling inflation opens the door to rate cuts that lift values and lower debt costs; sticky inflation keeps rates and cap rates elevated.",
    trend: [3.7, 3.5, 3.4, 3.2, 3.1, 3.0, 2.95, 2.92, 2.9] },
  { cat: "MACRO", type: "LEADING", name: "PPI (Final Demand)", group: "macro", value: "+2.6%", unit: "PPI YoY", change: "+0.0% MoM", note: "Producer prices — upstream of CPI", tone: "neutral",
    measures: "The year-over-year change in prices producers receive (PPI Final Demand, BLS). Producer prices sit upstream of consumer prices and upstream of construction input costs, which is why this is classified leading while CPI and PCE are trailing.",
    impact: "Rising PPI feeds through to construction costs and, with a lag, to CPI — squeezing development margins and keeping the Fed tighter for longer. Falling PPI relieves both.",
    trend: [2.2, 2.3, 2.4, 2.5, 2.5, 2.6, 2.6, 2.6, 2.6] },
  { cat: "MACRO", type: "TRAILING", name: "PCE Price Index", group: "macro", value: "+2.5%", unit: "PCE YoY", change: "+0.0% MoM", note: "The Fed's preferred inflation gauge", tone: "neutral",
    measures: "The year-over-year change in the PCE price index (BEA). Distinct from CPI: it uses a broader basket and reweights as consumers substitute, so it typically runs cooler. This is the gauge the Fed actually targets — never averaged with CPI, which measures a different construct.",
    impact: "PCE is what moves the Fed, and the Fed moves the rate that prices your debt and your cap rate. Watch the CPI-PCE gap: when they diverge, the Fed follows PCE.",
    trend: [2.7, 2.7, 2.6, 2.6, 2.5, 2.5, 2.5, 2.5, 2.5] },

  // Core = ex food & energy. Each core sits beside its headline rather than
  // replacing it: the two answer different questions, and the gap between them
  // is the signal. Headline is what tenants actually pay and what escalators
  // reference; core is what policy responds to, because food and energy are
  // volatile and largely outside the Fed's reach. They are separate indicators
  // with separate attributions and are never averaged together.
  { cat: "MACRO", type: "TRAILING", name: "Core CPI", group: "macro", value: "+2.8%", unit: "CPI ex food & energy, YoY", change: "+0.0% MoM", note: "CPI less food & energy (BLS)", tone: "neutral",
    measures: "CPI stripped of food and energy (BLS). Removing the two most volatile components exposes the persistent trend underneath a noisy headline. Shelter is roughly a third of the CPI basket and the largest single component of core — which is why core inflation and multifamily rents are structurally linked, not merely correlated.",
    impact: "Core is stickier than headline and turns more slowly, so it is the better read on whether the rate regime is actually changing. Core running hot keeps cap rates elevated even if a headline print looks benign.",
    trend: [3.3, 3.2, 3.1, 3.0, 3.0, 2.9, 2.9, 2.8, 2.8] },
  { cat: "MACRO", type: "TRAILING", name: "Core PCE", group: "macro", value: "+2.6%", unit: "PCE ex food & energy, YoY", change: "+0.0% MoM", note: "The Fed's actual 2% target", tone: "neutral",
    measures: "PCE stripped of food and energy (BEA). Of every inflation series on this page, this is the one the Federal Reserve formally targets at 2% — the number FOMC decisions are actually written against.",
    impact: "This is the shortest path from an inflation print to your debt cost. Core PCE moves the Fed, the Fed moves the front end, and the front end reprices everything from bridge debt to exit cap assumptions. When headline and Core PCE disagree, follow this one.",
    trend: [2.9, 2.8, 2.8, 2.7, 2.7, 2.7, 2.6, 2.6, 2.6] },
  { cat: "MACRO", type: "LEADING", name: "Core PPI", group: "macro", value: "+2.7%", unit: "PPI ex foods & energy, YoY", change: "+0.0% MoM", note: "Producer prices less foods & energy (BLS)", tone: "neutral",
    measures: "PPI Final Demand less foods and energy (BLS). The upstream analogue of Core CPI: the persistent trend in what producers charge, with the volatile inputs removed. Leading, like headline PPI — producer prices move before consumer prices.",
    impact: "Core PPI is the cleanest early read on where construction and operating costs are heading, before they show up in CPI or in your expense line. Rising core PPI squeezes development margins first and rents later.",
    trend: [2.4, 2.5, 2.5, 2.6, 2.6, 2.6, 2.7, 2.7, 2.7] },
  { cat: "MACRO", type: "LEADING", name: "Federal Funds Rate", value: "4.50%", unit: "Fed funds upper", change: "0 bps", note: "Fed on hold; cuts priced later in year", tone: "neutral",
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
  { cat: "MACRO", type: "LEADING", name: "Yield Curve Spread", group: "re", value: "0.66pp", unit: "10Y minus 3M", change: "+0.60pp YoY", note: "Curve un-inverted — recession signal easing", tone: "bull",
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
  { cat: "CAPITAL", type: "TRAILING", name: "Credit Card Delinquency Rate", group: "capital", value: "2.92%", unit: "of card loans", change: "-0.14pp YoY", note: "Earliest-cracking read on consumer stress (FRED)", tone: "neutral",
    measures: "Share of credit-card loan balances delinquent at commercial banks. The first place stretched households fall behind, so it reads earlier than other delinquencies.",
    impact: "Rising card delinquency is an early sign of consumer stress that precedes renter delinquency, concessions, and demand softening.",
    trend: [3.17, 3.22, 3.2, 3.08, 3.06, 3.04, 2.98, 2.94, 2.92] },
  { cat: "CAPITAL", type: "TRAILING", name: "Consumer Loan Delinquency Rate", group: "capital", value: "2.64%", unit: "of consumer loans", change: "-0.13pp YoY", note: "All commercial banks (FRED)", tone: "neutral",
    measures: "Share of consumer-loan balances delinquent at commercial banks — a broad read on household repayment stress.",
    impact: "Rising delinquency signals weakening household finances that ripple into rental demand and collections.",
    trend: [2.67, 2.72, 2.73, 2.76, 2.77, 2.75, 2.72, 2.62, 2.64] },
  { cat: "CAPITAL", type: "TRAILING", name: "Mortgage Delinquency Rate (Single-Family)", group: "capital", value: "1.89%", unit: "of SF mortgages", change: "+0.12pp YoY", note: "All commercial banks (FRED)", tone: "neutral",
    measures: "Share of single-family residential mortgages delinquent at commercial banks. Mortgages are paid longest, so this lags other stress signals.",
    impact: "Rising mortgage delinquency confirms owner-side distress; ticking up off cycle lows is worth watching.",
    trend: [1.71, 1.73, 1.74, 1.78, 1.77, 1.78, 1.78, 1.79, 1.89] },
  { cat: "MACRO", type: "TRAILING", name: "Household Debt Service Ratio", group: "macro", value: "11.16%", unit: "of disposable income", change: "+0.06pp YoY", note: "Debt payments vs. DPI (FRED)", tone: "neutral",
    measures: "Household debt-service payments as a share of disposable personal income — how much of household budgets is committed to servicing debt.",
    impact: "A rising ratio leaves households less room to absorb rent increases; a structural read on consumer financial capacity.",
    trend: [11.06, 11.02, 11.14, 11.12, 11.11, 11.12, 11.23, 11.32, 11.16] },
  { cat: "MACRO", type: "TRAILING", name: "Consumer Credit Outstanding (Total)", group: "macro", value: "$5.15T", unit: "outstanding", change: "+$105B YoY", note: "Fed G.19, owned & securitized", tone: "neutral",
    measures: "Total consumer credit outstanding (Fed G.19) — the aggregate stock of household borrowing across cards, autos, and student loans.",
    impact: "Rising leverage can support spending near-term but raises stress risk if incomes soften — context for household balance-sheet health.",
    trend: [5.06, 5.07, 5.08, 5.08, 5.10, 5.10, 5.11, 5.13, 5.15] },
  { cat: "MACRO", type: "TRAILING", name: "Revolving Consumer Credit", group: "macro", value: "$1.35T", unit: "outstanding", change: "+$49B YoY", note: "Fed G.19 — mainly credit cards", tone: "neutral",
    measures: "Revolving consumer credit (Fed G.19) — primarily credit-card balances, the most rate-sensitive and stress-prone slice of household debt.",
    impact: "Accelerating revolving credit can signal households leaning on cards to cover costs — a precursor to delinquency.",
    trend: [1.31, 1.31, 1.32, 1.32, 1.32, 1.33, 1.33, 1.34, 1.35] },
  { cat: "MACRO", type: "TRAILING", name: "Nonrevolving Consumer Credit", group: "macro", value: "$3.80T", unit: "outstanding", change: "+$56B YoY", note: "Fed G.19 — auto & student loans", tone: "neutral",
    measures: "Nonrevolving consumer credit (Fed G.19) — primarily auto and student loans, the larger, more stable component of household debt.",
    impact: "Trends here track big-ticket household commitments that compete with housing costs in the monthly budget.",
    trend: [3.75, 3.76, 3.76, 3.77, 3.78, 3.78, 3.78, 3.80, 3.80] },
];

// Market Maps page
export const MARKET_GROUPS = [
  {
    region: "TOP MARKETS",
    markets: [
      { city: "Atlanta, GA", cbsa: "12060", rent: "+3.8%", score: 82, tone: "bull" },
      { city: "Miami, FL", cbsa: "33100", rent: "+3.5%", score: 81, tone: "bull" },
      { city: "Dallas, TX", cbsa: "19100", rent: "+2.8%", score: 80, tone: "bull" },
      { city: "Jersey City, NJ", cbsa: "35620", zori: "New York, NY", rent: "+3.0%", score: 78, tone: "bull" },
      { city: "Houston, TX", cbsa: "26420", rent: "+2.5%", score: 76, tone: "bull" },
    ],
  },
  {
    region: "SUN BELT",
    markets: [
      { city: "Austin, TX", cbsa: "12420", rent: "+5.1%", score: 84, tone: "bull" },
      { city: "Nashville, TN", cbsa: "34980", rent: "+4.7%", score: 83, tone: "bull" },
      { city: "Raleigh, NC", cbsa: "39580", rent: "+3.7%", score: 80, tone: "bull" },
      { city: "Orlando, FL", cbsa: "36740", rent: "+3.6%", score: 79, tone: "bull" },
      { city: "Tampa, FL", cbsa: "45300", rent: "+3.4%", score: 78, tone: "bull" },
      { city: "Phoenix, AZ", cbsa: "38060", rent: "+3.2%", score: 77, tone: "bull" },
      { city: "Jacksonville, FL", cbsa: "27260", rent: "+3.0%", score: 74, tone: "bull" },
      { city: "San Antonio, TX", cbsa: "41700", rent: "+2.6%", score: 72, tone: "neutral" },
    ],
  },
  {
    region: "SECONDARY & PIVOT",
    markets: [
      { city: "Salt Lake City, UT", cbsa: "41620", rent: "+3.5%", score: 77, tone: "bull" },
      { city: "Indianapolis, IN", cbsa: "26900", rent: "+2.9%", score: 75, tone: "bull" },
      { city: "Fayetteville, AR", cbsa: "22220", rent: "+3.3%", score: 74, tone: "bull" },
      { city: "Savannah, GA", cbsa: "42340", rent: "+3.1%", score: 73, tone: "bull" },
      { city: "Colorado Springs, CO", cbsa: "17820", rent: "+2.7%", score: 71, tone: "neutral" },
      { city: "Birmingham, AL", cbsa: "13820", rent: "+2.4%", score: 70, tone: "bull" },
      { city: "Lubbock, TX", cbsa: "31180", rent: "+2.6%", score: 69, tone: "neutral" },
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
  .map(({ city, rent, score, tone }) => ({ city, rent, score, tone }));

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
  { tone: "bear", title: "Cap Rate Spread Compression Reversal", body: "10Y Treasury at 4.42% vs. avg cap rate 5.60% — 118bps spread. Historical spread is 125–150bps. Refinancing stress risk elevated for 2024–2025 maturities.", tags: ["Capital", "National", "Gateway Markets"], time: "4 hours ago", conf: 79 },
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
    { ticker: "FNMA", name: "Fannie Mae", gse: "fnma_mf_delinquency", gseLabel: "MF delinquency", gseVol: "fnma_mf_volume" },
    { ticker: "FMCC", name: "Freddie Mac", gse: "fmcc_mf_delinquency", gseLabel: "MF delinquency", gseVol: "fmcc_mf_volume" },
  ]},
  { category: "Brokerages", members: [
    { ticker: "CBRE", name: "CBRE Group", price: 128.90, chg: 0.5 },
    { ticker: "JLL", name: "Jones Lang LaSalle", price: 265.40, chg: -0.3 },
    { ticker: "COMP", name: "Compass", price: 6.80, chg: 3.2 },
    { ticker: "AGNT", name: "eXp World Holdings", price: 4.52, chg: -0.9 },
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
  heroLead: "The science of multifamily real estate investing — market intelligence for owners, operators, investors, management firms, lenders, and equity groups.",
  whoHeadline: "Built for the people who live inside the multifamily cycle.",
  whoLead:
    "Cignal System is market intelligence for multifamily real estate — it turns the economic data that moves rents, occupancy, and values into a clear read on where the cycle is headed. If you own, operate, invest in, manage, or finance apartments, it's built for you.",
  audiences: [
    { icon: "Building2", name: "Owners/Operators", desc: "Time acquisitions and refinances to the cycle — and read rents, occupancy, and concessions before they hit your P&L." },
    { icon: "TrendingUp", name: "Investors", desc: "Underwrite with leading indicators and spot the markets turning first." },
    { icon: "Users", name: "Management Firms", desc: "Give every property a cycle-aware read to guide pricing and strategy." },
    { icon: "Landmark", name: "Lenders/Equity Groups", desc: "Size exposure and time capital deployment to the cycle — back markets turning up, flag those rolling over." },
  ],
  dashLead: "Real-time leading & trailing economic indicators for multifamily real estate.",
  marketMetricA: "Rent",
  marketMetricB: "Vac",
  aboutAsset: "multifamily real estate",
  founderRole: "a multifamily operator and market-cycle researcher",
  cycleMetric: "OCCUPANCY",
  cyclePhases: ["Occupancy rising", "Demand > supply", "Supply > demand", "Occupancy falling"],
  mmSubtitle: "Multifamily fundamentals scored and ranked across top U.S. metros.",
  mmMetrics: ["Rent Growth", "Employment", "Vacancy", "Unemployment"],
  fcSubtitle: "5-year forward projections for multifamily fundamentals across leading indicators.",
  fcMetrics: ["Rent Growth", "Vacancy", "Cap Rate", "NOI Growth"],
  fcColLabel: "RENT",
  pfSubtitle: "Monitor your multifamily assets against live market signals.",
  pfChartTitle: "NOI by Asset ($M)",
  footerTagline: "Military Grade Economic Intelligence for Multifamily Real Estate Owners, Operators, Investors, Management Firms, Lenders and Equity Groups.",
};
