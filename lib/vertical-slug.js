// Lightweight, edge-safe vertical detection used by middleware.
export const DEFAULT_VERTICAL = "multifamily";

const ALIASES = {
  multifamily: "multifamily",
  investor: "investor",
  investors: "investor",
  passive: "investor",
  realestate: "general-real-estate",
  "general-real-estate": "general-real-estate",
  generalrealestate: "general-real-estate",
  development: "real-estate-development",
  "real-estate-development": "real-estate-development",
  redevelopment: "real-estate-development",
  smallbusiness: "small-business",
  "small-business": "small-business",
  personalfinance: "personal-finance",
  "personal-finance": "personal-finance",
};

export function verticalSlugFromHost(host) {
  if (!host) return DEFAULT_VERTICAL;
  const h = host.split(":")[0].toLowerCase();
  const parts = h.split(".");
  const sub = parts.length >= 3 ? parts[0] : "";
  return ALIASES[sub] || DEFAULT_VERTICAL;
}
