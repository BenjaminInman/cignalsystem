// Tier/page access helpers.
// The DATABASE (tier_access table) is the source of truth for enforcement.
// FREE_PAGES below is a lightweight mirror used only for cosmetic nav locks.

// Every page that participates in tier gating (the Terminal suite).
export const SUITE_PAGES = [
  "dashboard",
  "indicators",
  "market-maps",
  "indices",
  "forecasts",
  "research",
  "portfolio",
  "community",
  "where-are-we",
  "signals",
];

// Pages a free account can open. Cosmetic only (nav padlocks). Real gate = DB.
// Mirrors tier_access(free) for the nav padlocks. The DB is the enforcement
// boundary; this only decides whether a row shows a lock icon. Keep in sync.
// Free = the three tabs that show a prospect what the product is without
// giving away the product. Dashboard is deliberately included even though it
// is thin without Pro — it is the shell they upgrade into.
export const FREE_PAGES = ["dashboard", "signals", "where-are-we"];

// Cignal+-EXCLUSIVE pages. These are gated by tier directly in middleware
// (hasTier >= cignal_plus), NOT via the tier_access table — so they lock the
// moment they ship, without needing a DB row seeded per tier.
export const CIGNAL_PLUS_PAGES = [];

// First path segment, e.g. "/market-maps/x" -> "market-maps".
export function firstSegment(pathname) {
  return pathname.split("/").filter(Boolean)[0] || "";
}

// Friendly labels for the upgrade screen.
export const PAGE_LABELS = {
  forecasts: "Forecasts",
  research: "Research",
  portfolio: "Portfolio",
  community: "Community",
  indices: "Indices",
  "market-maps": "Market Maps",
  indicators: "Indicators",
  dashboard: "Dashboard",
  "where-are-we": "Where Are We",
  signals: "Signals",
};
