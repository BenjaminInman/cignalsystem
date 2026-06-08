// General Real Estate vertical content (proof-of-concept second tenant).
// Mirrors the shape of lib/data.js but tuned to the broader for-sale /
// transactional real-estate market. Operator-tool consts (market maps,
// forecasts, portfolio, research) are intentionally empty — those pages are
// gated to "coming soon" for this vertical until they're adapted.

import { INDICES as MF_INDICES } from "@/lib/data";

export const TICKER = [
  { label: "MEDIAN SALE PRICE", value: "$418K", delta: "+2.1%", dir: "up" },
  { label: "30Y MORTGAGE RATE", value: "6.85%", delta: "+9bps", dir: "down" },
  { label: "10Y TREASURY", value: "4.42%", delta: "-8bps", dir: "up" },
  { label: "HOUSING STARTS", value: "1.36M", delta: "-3.2%", dir: "down" },
  { label: "EXISTING HOME SALES", value: "4.15M", delta: "+0.8%", dir: "up" },
  { label: "DAYS ON MARKET", value: "52", delta: "+3", dir: "down" },
  { label: "MONTHS OF SUPPLY", value: "3.5", delta: "+0.2", dir: "down" },
  { label: "EMPLOYMENT GROWTH", value: "+1.9%", delta: "+0.1%", dir: "up" },
];

export const COMPOSITE = { label: "NEUTRAL", confidence: 54, tone: "neutral" };

export const DASH_STATS = [
  { label: "BULLISH SIGNALS", value: "5", unit: "/10", tone: "bull" },
  { label: "BEARISH SIGNALS", value: "3", unit: "/10", tone: "bear" },
  { label: "MARKETS TRACKED", value: "50", unit: "MSAs", tone: "ink" },
  { label: "DATA POINTS", value: "1,500+", unit: "live", tone: "signal" },
];

const up1 = [3, 3.2, 3.1, 3.4, 3.6, 3.8, 4.0];
const down1 = [5, 4.6, 4.8, 4.4, 4.5, 4.2, 4.1];

export const LEADING_CARDS = [
  { cat: "SUPPLY", name: "Building Permits", value: "1.42M", delta: "-4.0%", dir: "down", tone: "bear", note: "Permits easing — future supply pipeline moderating", series: down1 },
  { cat: "DEMAND", name: "Pending Home Sales", value: "+1.8%", delta: "+0.6%", dir: "up", tone: "bull", note: "Contract signings firming after the latest rate dip", series: up1 },
  { cat: "DEMAND", name: "Mortgage Purchase Apps", value: "+3.2%", delta: "+1.1%", dir: "up", tone: "bull", note: "Purchase applications rebounding off cycle lows", series: up1 },
  { cat: "MACRO", name: "30Y Mortgage Rate", value: "6.85%", delta: "+9bps", dir: "down", tone: "bear", note: "Rates ticking back up, pressuring affordability", series: up1 },
];

export const TRAILING_CARDS = [
  { cat: "PERFORMANCE", name: "Median Sale Price", value: "$418K", delta: "+2.1%", dir: "up", tone: "neutral", note: "Prices grinding higher at a slower, sustainable pace", series: up1 },
  { cat: "PERFORMANCE", name: "Existing Home Sales", value: "4.15M", delta: "+0.8%", dir: "up", tone: "bull", note: "Resale volume stabilizing off multi-year lows", series: up1 },
  { cat: "CAPITAL", name: "Months of Supply", value: "3.5", delta: "+0.2", dir: "down", tone: "neutral", note: "Inventory slowly rebuilding toward a balanced market", series: up1 },
  { cat: "CAPITAL", name: "Price-to-Income Ratio", value: "5.1x", delta: "+0.1", dir: "down", tone: "bear", note: "Affordability stretched versus the long-run average", series: up1 },
];

// rent slot = price growth, vac slot = months of supply (labels driven by COPY)
export const TOP_MARKETS = [
  { city: "Austin, TX", score: 82, rent: "+3.8%", vac: "2.9", tone: "bull" },
  { city: "Nashville, TN", score: 80, rent: "+3.5%", vac: "3.0", tone: "bull" },
  { city: "Tampa, FL", score: 74, rent: "+2.9%", vac: "3.4", tone: "bull" },
  { city: "Denver, CO", score: 68, rent: "+1.9%", vac: "3.6", tone: "neutral" },
  { city: "Seattle, WA", score: 57, rent: "+1.1%", vac: "3.9", tone: "neutral" },
  { city: "Chicago, IL", score: 47, rent: "-0.4%", vac: "4.6", tone: "bear" },
];

export const INDICATORS = [
  { cat: "SUPPLY", type: "LEADING", name: "Building Permits", value: "1.42M", unit: "annualized", change: "-4.0% MoM", note: "Easing for 3 straight months", tone: "bear",
    measures: "Forward-looking supply gauge for new construction. Falling permits point to fewer completions in 12–18 months.",
    impact: "Slower supply supports prices for existing owners but signals builder caution about demand.",
    trend: [1.62, 1.58, 1.55, 1.52, 1.49, 1.47, 1.45, 1.43, 1.42] },
  { cat: "DEMAND", type: "LEADING", name: "Pending Home Sales", value: "+1.8%", unit: "MoM", change: "+0.6% MoM", note: "Firming after the latest rate dip", tone: "bull",
    measures: "Contract signings on existing homes — a leading read on closed sales one to two months out.",
    impact: "Rising pendings foreshadow stronger transaction volume and firmer pricing.",
    trend: [-2.1, -1.2, -0.4, 0.3, 0.8, 1.1, 1.4, 1.6, 1.8] },
  { cat: "DEMAND", type: "LEADING", name: "Days On Market", value: "52", unit: "median days", change: "+3 days MoM", note: "Realtor.com national median", tone: "bear",
    measures: "How long for-sale homes sit before going under contract. Rising days-on-market signals cooling demand and more buyer leverage.",
    impact: "Lengthening days-on-market is an early demand-softening signal across the housing market.",
    trend: [38, 40, 44, 48, 50, 53, 55, 54, 52] },
  { cat: "MACRO", type: "LEADING", name: "30Y Mortgage Rate", value: "6.85%", unit: "avg", change: "+9bps WoW", note: "Back up after a brief dip", tone: "bear",
    measures: "The benchmark borrowing cost for buyers. Higher rates cut purchasing power and cool demand.",
    impact: "Rising rates pressure affordability, sales volume, and price growth across the market.",
    trend: [7.6, 7.4, 7.1, 6.9, 6.7, 6.6, 6.7, 6.8, 6.85] },
  { cat: "PERFORMANCE", type: "TRAILING", name: "Median Sale Price", value: "$418K", unit: "national", change: "+2.1% YoY", note: "Slower, steadier appreciation", tone: "neutral",
    measures: "The national median closed sale price — realized pricing across the market.",
    impact: "Moderating growth signals normalization; underwrite to sustainable appreciation, not peak.",
    trend: [395, 399, 402, 405, 408, 411, 414, 416, 418] },
  { cat: "PERFORMANCE", type: "TRAILING", name: "Existing Home Sales", value: "4.15M", unit: "annualized", change: "+0.8% MoM", note: "Stabilizing off cycle lows", tone: "bull",
    measures: "Annualized pace of closed existing-home sales — the core measure of market liquidity.",
    impact: "Recovering volume supports brokerage, lending, and related-industry revenue.",
    trend: [3.85, 3.9, 3.95, 4.0, 4.05, 4.08, 4.1, 4.12, 4.15] },
  { cat: "CAPITAL", type: "TRAILING", name: "Months of Supply", value: "3.5", unit: "months", change: "+0.2 MoM", note: "Rebuilding toward balance (~5–6 mo.)", tone: "neutral",
    measures: "How long it would take to sell current inventory at the current sales pace. Higher supply cools price growth.",
    impact: "Still below a balanced market — inventory remains a tailwind for prices, but the gap is narrowing.",
    trend: [2.6, 2.7, 2.9, 3.0, 3.1, 3.2, 3.3, 3.4, 3.5] },
];

export const SIGNALS = [
  { tone: "bull", title: "Purchase Applications Rebounding Off Lows", body: "Mortgage purchase applications up 3.2% as the 30-year eased toward 6.7% mid-month. Demand is rate-sensitive but responsive — a constructive sign for spring volume.", tags: ["Demand", "National"], time: "3 hours ago", conf: 81 },
  { tone: "bear", title: "Inventory Rebuild Pressuring Pricing Power", body: "Months of supply rose to 3.5 from 2.6 a year ago. Still seller-favorable, but the cushion that drove double-digit appreciation is thinning.", tags: ["Supply", "National"], time: "6 hours ago", conf: 76 },
  { tone: "bull", title: "Permit Pullback Eases Future Oversupply Risk", body: "Building permits annualized at 1.42M, down 4% — fewer completions into 2026 support pricing for existing inventory.", tags: ["Supply", "National"], time: "Yesterday", conf: 84 },
  { tone: "neutral", title: "Price Growth Settling Into a 2–3% Lane", body: "Median sale price up 2.1% YoY, well off the 2021–22 surge. The pace of deceleration is slowing — likely finding a sustainable baseline.", tags: ["Performance", "National"], time: "Yesterday", conf: 67 },
  { tone: "bear", title: "Affordability Ceiling Capping Demand", body: "Price-to-income at 5.1x versus a ~3.5x long-run norm. Even with steady jobs, stretched affordability limits how far prices can run.", tags: ["Macro", "National"], time: "2 days ago", conf: 79 },
  { tone: "bull", title: "Sun Belt Sales Volume Leads the Recovery", body: "Existing-home sales are firming fastest across Austin, Nashville, and Tampa as in-migration and job growth hold up demand.", tags: ["Demand", "Austin TX", "Tampa FL", "+1"], time: "3 days ago", conf: 80 },
];

export const NEWS = [
  { id: 1, title: "Mortgage rates dip below 6.8%, nudging purchase demand higher", source: "Cignal Newsdesk", date: "May 27, 2026", cat: "Capital", excerpt: "A softer rate week pulled buyers off the sidelines, lifting purchase applications for a third straight week." },
  { id: 2, title: "Existing-home sales stabilize as inventory slowly rebuilds", source: "Cignal Newsdesk", date: "May 26, 2026", cat: "Demand", excerpt: "Resale volume held near a 4.15M annual pace while months of supply edged up toward a more balanced market." },
  { id: 3, title: "Building permits slip again as builders stay cautious", source: "Cignal Newsdesk", date: "May 22, 2026", cat: "Supply", excerpt: "Permits fell 4%, pointing to fewer completions into 2026 and easing longer-term oversupply concerns." },
  { id: 4, title: "Home-price growth cools to a 2% annual pace nationally", source: "Cignal Newsdesk", date: "May 19, 2026", cat: "Performance", excerpt: "Appreciation continues to normalize off the pandemic surge, settling into a slower, more sustainable lane." },
  { id: 5, title: "Days on market lengthen as buyers regain negotiating room", source: "Cignal Newsdesk", date: "May 14, 2026", cat: "Demand", excerpt: "Listings are sitting longer — a leading sign of cooling demand even as transaction volume holds." },
  { id: 6, title: "Sun Belt metros lead the transaction-volume recovery", source: "Cignal Newsdesk", date: "May 9, 2026", cat: "Demand", excerpt: "Austin, Nashville, and Tampa posted the firmest sales gains on continued in-migration and job growth." },
];

// Cross-real-estate public equities apply here too — reuse the multifamily set.
export const INDICES = MF_INDICES;

// Operator tools — gated to "coming soon" for this vertical (see lib/verticals).
export const MARKET_GROUPS = [];
export const FORECAST_MARKETS = [];
export const FORECAST_DRIVERS = [];
export const PORTFOLIO_STATS = [];
export const PORTFOLIO_ASSETS = [];
export const RESEARCH = [];

export const COPY = {
  heroKicker: "Market Intelligence · Real Estate",
  heroAsset: "the real estate market",
  whoHeadline: "Built for the people who live inside the real estate cycle.",
  whoLead:
    "Cignal System is market intelligence for real estate — it turns the economic data that moves prices, sales volume, and values into a clear read on where the cycle is headed. If you buy, sell, develop, invest in, or finance property, it's built for you.",
  audiences: [
    { icon: "Building2", name: "Owners & Investors", desc: "Time purchases, refinances, and sales to the cycle — not the headlines." },
    { icon: "SlidersHorizontal", name: "Brokers & Agents", desc: "See where prices, inventory, and demand are heading before the market reacts." },
    { icon: "TrendingUp", name: "Developers", desc: "Underwrite with leading indicators and spot the markets turning first." },
    { icon: "Users", name: "Lenders & Capital", desc: "Read rate and demand signals to time credit and capital decisions." },
  ],
  dashLead: "Real-time leading & trailing economic indicators for the real estate market.",
  marketMetricA: "Price",
  marketMetricB: "Supply",
};
