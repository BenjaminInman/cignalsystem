import * as multifamily from "@/lib/data";
import * as generalRealEstate from "@/lib/content/general-real-estate";

const BUNDLES = {
  multifamily,
  "general-real-estate": generalRealEstate,
};

const KEYS = [
  "TICKER", "COMPOSITE", "DASH_STATS", "LEADING_CARDS", "TRAILING_CARDS",
  "TOP_MARKETS", "INDICATORS", "MARKET_GROUPS", "FORECAST_MARKETS",
  "FORECAST_DRIVERS", "SIGNALS", "RESEARCH", "PORTFOLIO_STATS",
  "PORTFOLIO_ASSETS", "NEWS", "INDICES", "COPY",
];

// Returns a plain, serializable object (safe to pass server -> client provider).
export function getContent(slug) {
  const b = BUNDLES[slug] || multifamily;
  const out = {};
  for (const k of KEYS) out[k] = b[k] !== undefined ? b[k] : multifamily[k];
  return out;
}
