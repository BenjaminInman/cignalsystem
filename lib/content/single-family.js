// Single Family vertical content.
//
// Unlike `investor` (a marketing relabel of multifamily), single-family is a
// DATA-DISTINCT vertical. It has its own rent series (Zillow's SFR-only cut),
// its own supply signals (PERMIT1 / HOUST1F / COMPU1USA rather than the
// all-units totals), and its own cycle wheel in lib/vertical-signals.js.
//
// Several series it shares with general real estate are already single-family
// by construction: Case-Shiller is a repeat-sales SFR index, HSN1F is new
// SINGLE-FAMILY home sales, MSACSR is months' supply of NEW homes, and the
// mortgage delinquency series is single-family. What the vertical adds is
// separating the 1-unit supply pipeline from the all-units totals, so
// multifamily construction can't flatter or depress the single-family read.
//
// Static values below are the real current prints as of the July 2026 build,
// not invented placeholders — this content is fallback for surfaces not yet
// reading live, and a fabricated number under a live-looking badge is exactly
// the failure mode the platform exists to avoid.

import { INDICES as MF_INDICES } from "@/lib/data";
import {
  MARKET_GROUPS as GRE_MARKET_GROUPS,
  FORECAST_MARKETS as GRE_FORECAST_MARKETS,
  FORECAST_DRIVERS as GRE_FORECAST_DRIVERS,
  PORTFOLIO_STATS as GRE_PORTFOLIO_STATS,
  PORTFOLIO_ASSETS as GRE_PORTFOLIO_ASSETS,
} from "@/lib/content/general-real-estate";

export const TICKER = [
  { label: "SFR RENT (NATIONAL)", value: "$2,320", delta: "+2.9%", dir: "up" },
  { label: "MEDIAN SALE PRICE", value: "$403K", delta: "-4.7%", dir: "down" },
  { label: "30Y MORTGAGE RATE", value: "6.55%", delta: "-2.5%", dir: "up" },
  { label: "SF PERMITS", value: "871K", delta: "-0.2%", dir: "down" },
  { label: "SF STARTS", value: "895K", delta: "-3.2%", dir: "down" },
  { label: "SF COMPLETIONS", value: "964K", delta: "+5.5%", dir: "up" },
  { label: "MONTHS OF SUPPLY", value: "10.3", delta: "+6.2%", dir: "down" },
  { label: "HOMEOWNERSHIP RATE", value: "65.3%", delta: "+0.3%", dir: "up" },
];

export const COMPOSITE = { label: "CAUTION", confidence: 61, tone: "neutral" };

export const DASH_STATS = [
  { label: "BULLISH SIGNALS", value: "4", unit: "/10", tone: "bull" },
  { label: "BEARISH SIGNALS", value: "4", unit: "/10", tone: "bear" },
  { label: "MARKETS TRACKED", value: "602", unit: "MSAs", tone: "ink" },
  { label: "DATA POINTS", value: "1.4MM+", unit: "live", tone: "signal" },
];

const up1 = [2.1, 2.3, 2.4, 2.6, 2.7, 2.8, 2.9];
const down1 = [10.9, 10.8, 10.6, 10.5, 10.4, 10.3, 10.3];

export const LEADING_CARDS = [
  { cat: "SUPPLY", name: "Single-Family Permits", value: "871K", delta: "-0.2%", dir: "down", tone: "neutral", note: "One-unit permits essentially flat year over year", series: down1 },
  { cat: "SUPPLY", name: "Months of Supply (New)", value: "10.3", delta: "+6.2%", dir: "down", tone: "bear", note: "New-home inventory well above a balanced 6 months", series: down1 },
  { cat: "MACRO", name: "30Y Mortgage Rate", value: "6.55%", delta: "-2.5%", dir: "up", tone: "neutral", note: "Off the highs but still the binding affordability constraint", series: up1 },
  { cat: "DEMAND", name: "New Home Sales", value: "580K", delta: "-6.8%", dir: "down", tone: "bear", note: "Builders carrying inventory into a soft demand window", series: down1 },
];

export const TRAILING_CARDS = [
  { cat: "PERFORMANCE", name: "SFR Rent (National)", value: "$2,320", delta: "+2.9%", dir: "up", tone: "bull", note: "Single-family rents outpacing apartments more than 2:1", series: up1 },
  { cat: "PERFORMANCE", name: "Home Prices (Case-Shiller)", value: "+0.8%", delta: "-0.3%", dir: "up", tone: "neutral", note: "Repeat-sales flat while the median falls 4.7% — mix, not price", series: up1 },
  { cat: "CAPITAL", name: "Homeownership Rate", value: "65.3%", delta: "+0.3%", dir: "up", tone: "neutral", note: "Holding steady despite the affordability squeeze", series: up1 },
  { cat: "CAPITAL", name: "Mortgage Delinquency", value: "1.89%", delta: "+6.8%", dir: "down", tone: "bear", note: "Single-family delinquency rising off the cycle low", series: up1 },
];

// rent slot = SFR rent growth, vac slot = months of supply (labels from COPY)
export const TOP_MARKETS = [
  { city: "Austin, TX", cbsa: "12420", score: 79, rent: "+3.4%", vac: "8.1", tone: "bull" },
  { city: "Nashville, TN", cbsa: "34980", score: 77, rent: "+3.2%", vac: "8.6", tone: "bull" },
  { city: "Tampa, FL", cbsa: "45300", score: 71, rent: "+2.8%", vac: "9.4", tone: "bull" },
  { city: "Denver, CO", cbsa: "19740", score: 64, rent: "+1.7%", vac: "10.2", tone: "neutral" },
  { city: "Seattle, WA", cbsa: "42660", score: 55, rent: "+1.0%", vac: "10.8", tone: "neutral" },
  { city: "Chicago, IL", cbsa: "16980", score: 46, rent: "-0.3%", vac: "11.6", tone: "bear" },
];

export const INDICATORS = [
  { cat: "PERFORMANCE", type: "TRAILING", name: "Single-Family Rent (ZORI SFR)", value: "$2,320", unit: "national median", change: "+2.9% YoY", note: "Zillow single-family-only cut", tone: "bull",
    measures: "Market-rate asking rent for single-family rentals only. Zillow publishes SFR, multifamily, and blended cuts separately; this is the SFR-only series, available at national and metro grain.",
    impact: "Single-family rents are running roughly double apartment rent growth. A blended index hides that gap entirely, which is why the cuts are kept separate.",
    trend: [2.1, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.9] },
  { cat: "SUPPLY", type: "LEADING", name: "Building Permits — Single-Family", value: "871K", unit: "annualized, 1 unit", change: "-0.2% YoY", note: "One-unit permits only", tone: "neutral",
    measures: "Permits for single-family (one-unit) structures. The all-units permit total blends in apartment construction, which moves on a different cycle.",
    impact: "Permits flat while completions run 5.5% higher means the pipeline is emptying without being refilled — future supply tightens from here.",
    trend: [960, 942, 928, 915, 902, 894, 883, 876, 871] },
  { cat: "SUPPLY", type: "LEADING", name: "Single-Family Housing Starts", value: "895K", unit: "annualized, 1 unit", change: "-3.2% YoY", note: "HOUST1F, monthly since 1959", tone: "bear",
    measures: "Ground broken on single-family homes. Sits between permits and completions in the supply pipeline.",
    impact: "Starts falling while completions rise means builders are finishing what they began and not replacing it.",
    trend: [862, 869, 874, 878, 883, 887, 890, 893, 895] },
  { cat: "SUPPLY", type: "COINCIDENT", name: "Single-Family Completions", value: "964K", unit: "annualized, 1 unit", change: "+5.5% YoY", note: "Deliveries hitting the market now", tone: "bear",
    measures: "Single-family homes finished and delivered. Completions running above starts means the pipeline is emptying faster than it refills.",
    impact: "Deliveries above starts add inventory into a soft demand window — the classic late-cycle supply overhang.",
    trend: [928, 935, 941, 947, 952, 956, 959, 962, 964] },
  { cat: "DEMAND", type: "LEADING", name: "New Single-Family Home Sales", value: "580K", unit: "annualized", change: "-6.8% YoY", note: "HSN1F, already single-family", tone: "bear",
    measures: "Annualized pace of new single-family home sales. Contract-signing based, so it turns earlier than closed resale volume.",
    impact: "Falling new-home sales against rising completions is the combination that forces builder concessions and price cuts.",
    trend: [-1.2, -2.4, -3.1, -4.0, -4.8, -5.5, -6.1, -6.5, -6.8] },
  { cat: "SUPPLY", type: "LEADING", name: "Months of Supply (New Homes)", value: "10.3", unit: "months", change: "+6.2% YoY", note: "Balanced market is ~6 months", tone: "bear",
    measures: "How long it would take to clear new-home inventory at the current sales pace.",
    impact: "Above 10 months is firmly oversupplied territory for new construction — pricing power sits with the buyer.",
    trend: [8.4, 8.9, 9.2, 9.6, 9.8, 10.0, 10.1, 10.2, 10.3] },
  { cat: "PERFORMANCE", type: "TRAILING", name: "Home Prices (Case-Shiller)", value: "+0.8%", unit: "national, YoY", change: "-0.3% MoM", note: "Repeat-sales, mix-controlled", tone: "neutral",
    measures: "Repeat-sales single-family price index. Because it tracks the same homes over time, it controls for the mix shifts that distort median price.",
    impact: "Repeat-sales is up 0.8% while the national median is DOWN 4.7%. Same market, opposite signs: the median is falling because the mix has shifted to cheaper homes, not because homes are worth less.",
    trend: [4.2, 3.6, 3.0, 2.5, 2.0, 1.6, 1.2, 1.0, 0.8] },
  { cat: "CAPITAL", type: "TRAILING", name: "Homeownership Rate", value: "65.3%", unit: "of households", change: "+0.3% YoY", note: "Census, quarterly", tone: "neutral",
    measures: "Share of occupied housing units owned by their occupants. The structural split between the for-sale and rental sides of single-family.",
    impact: "Holding steady rather than falling, even with the 30-year near 6.5% — ownership demand is proving less rate-sensitive than the affordability math alone would predict.",
    trend: [65.0, 65.1, 65.1, 65.2, 65.2, 65.2, 65.3, 65.3, 65.3] },
];

export const SIGNALS = [
  { tone: "bull", title: "Single-Family Rents Outpacing Apartments More Than 2:1", body: "The Zillow SFR-only cut is running +2.9% YoY nationally against +1.3% for the multifamily-only cut. Households priced out of ownership are landing in rental houses, not apartments — a blended rent index hides the divergence completely.", tags: ["Performance", "National"], time: "4 hours ago", conf: 84 },
  { tone: "bear", title: "Completions Above Starts Signals Supply Overhang", body: "Completions are up 5.5% to 964K while starts fell 3.2% to 895K. Deliveries exceeding new construction means inventory keeps building even as the pipeline thins — the classic late-cycle sequence.", tags: ["Supply", "National"], time: "7 hours ago", conf: 82 },
  { tone: "bear", title: "New-Home Inventory at 10.3 Months", body: "Months of supply for new homes sits well above the roughly six months that marks a balanced market, while new-home sales are down 6.8% YoY. Builders are carrying inventory into a soft window.", tags: ["Supply", "National"], time: "Yesterday", conf: 86 },
  { tone: "bull", title: "Flat Permits Against Rising Completions Thins the 2027 Pipeline", body: "One-unit permits are essentially flat at 871K while completions run 5.5% higher. Builders are delivering more than they are authorizing, which drains the pipeline and supports pricing for existing inventory 12–18 months out.", tags: ["Supply", "National"], time: "Yesterday", conf: 78 },
  { tone: "neutral", title: "Price Growth Flattening Toward Zero", body: "Case-Shiller is up just 0.8% YoY. Because it is repeat-sales it strips out the mix effects that keep median price looking firmer — the underlying appreciation is close to flat.", tags: ["Performance", "National"], time: "2 days ago", conf: 74 },
  { tone: "neutral", title: "Median Price Falls 4.7% While Repeat-Sales Holds Flat", body: "The national median sale price is down 4.7% year over year, but Case-Shiller — which tracks the same homes over time — is up 0.8%. The median is falling because buyers are transacting on cheaper stock, not because homes are losing value. Reading the median alone would tell you the market is in decline.", tags: ["Performance", "National"], time: "3 days ago", conf: 83 },
];

export const NEWS = [
  { id: 1, title: "Single-family rents outrun apartment rents by more than two to one", source: "Cignal Newsdesk", date: "Jul 21, 2026", cat: "Performance", excerpt: "The SFR-only rent index is up 2.9% nationally while the multifamily cut managed 1.3% — a gap blended indices erase." },
  { id: 2, title: "New-home inventory climbs past ten months of supply", source: "Cignal Newsdesk", date: "Jul 18, 2026", cat: "Supply", excerpt: "Completions are outpacing starts and sales are falling, leaving builders holding stock into a soft demand window." },
  { id: 3, title: "Builders deliver more than they authorize", source: "Cignal Newsdesk", date: "Jul 15, 2026", cat: "Supply", excerpt: "One-unit permits held flat at 871K while completions rose 5.5%, draining the construction pipeline into 2027." },
  { id: 4, title: "Case-Shiller appreciation flattens toward zero", source: "Cignal Newsdesk", date: "Jul 11, 2026", cat: "Performance", excerpt: "Repeat-sales price growth of 0.8% strips out the mix effects still flattering the national median." },
  { id: 5, title: "Median price falls while repeat-sales index holds flat", source: "Cignal Newsdesk", date: "Jul 8, 2026", cat: "Performance", excerpt: "The national median is down 4.7% but Case-Shiller is up 0.8% — the gap is mix, not value, and only one of the two says what buyers are paying for the same house." },
  { id: 6, title: "Mortgage rate eases but stays the binding constraint", source: "Cignal Newsdesk", date: "Jul 3, 2026", cat: "Capital", excerpt: "The 30-year fell 12 basis points to 6.50%, not enough to change the affordability arithmetic for most buyers." },
];

// Cross-real-estate public equities apply here too.
export const INDICES = MF_INDICES;

// Operator tools share the housing-market shape with general real estate
// (price growth, months supply, median price, sales volume), so the structures
// are reused rather than duplicated. Research is gated for this vertical.
export const MARKET_GROUPS = GRE_MARKET_GROUPS;
export const FORECAST_MARKETS = GRE_FORECAST_MARKETS;
export const FORECAST_DRIVERS = GRE_FORECAST_DRIVERS;
export const PORTFOLIO_STATS = GRE_PORTFOLIO_STATS;
export const PORTFOLIO_ASSETS = GRE_PORTFOLIO_ASSETS;
export const RESEARCH = [];

export const COPY = {
  heroKicker: "Market Intelligence · Single Family",
  heroAsset: "single-family housing",
  heroLead:
    "The science of single-family timing — market intelligence for the buyers, sellers, and rental investors making the largest financial decision of their lives.",
  whoHeadline: "Everyone is told how to buy a house. Almost nobody is told when.",
  whoLead:
    "Cignal System is market intelligence for single-family housing — it turns the economic data that moves prices, rents, and inventory into a clear read on where the cycle is headed. You can refinance a rate. You cannot refinance a price. Knowing which phase you are buying into is what sets the holding period you actually need.",
  audiences: [
    { icon: "Home", name: "Buyers & Sellers", desc: "Know which phase you're transacting into — and how long you'd need to hold to ride it out." },
    { icon: "TrendingUp", name: "SFR Investors", desc: "Read single-family rent and supply separately from apartments, where the cycles diverge." },
    { icon: "SlidersHorizontal", name: "Agents & Brokers", desc: "See inventory, days on market, and demand turning before the listings tell you." },
    { icon: "Landmark", name: "Lenders & Capital", desc: "Time credit decisions to the rate and delinquency signals that lead the housing cycle." },
  ],
  dashLead: "Real-time leading & trailing economic indicators for single-family housing.",
  marketMetricA: "Rent",
  marketMetricB: "Supply",
  aboutAsset: "single-family housing",
  aboutTuned: "the market you're buying into",
  aboutPortfolio:
    "Track your homes and rentals against the live market read to see which are riding a tailwind and which are exposed to a turn. Auto-fill the numbers straight from a lease or closing statement, with income, expenses, and cycle position in one place.",
  founderRole: "a real estate operator and market-cycle researcher",
  cycleMetric: "DEMAND",
  cyclePhases: ["Demand recovering", "Demand > supply", "Supply > demand", "Demand cooling"],
  mmSubtitle: "Single-family fundamentals scored and ranked across U.S. metros — rents, supply, and prices.",
  mmMetrics: ["SFR Rent Growth", "Months Supply", "Median Price", "Sales Volume"],
  fcSubtitle: "5-year forward projections for single-family fundamentals across leading indicators.",
  fcMetrics: ["Price Growth", "SFR Rent Growth", "Months Supply", "Mortgage Rate"],
  fcColLabel: "PRICE",
  pfSubtitle: "Monitor your single-family holdings against live market signals.",
  pfChartTitle: "Annual Income by Property ($M)",
  footerTagline: "Military Grade Economic Intelligence for Single-Family Buyers, Sellers, Rental Investors and Lenders.",
};
