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
];

// Pages a free account can open. Cosmetic only (nav padlocks). Real gate = DB.
export const FREE_PAGES = ["dashboard", "indicators", "indices", "portfolio"];

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
};
