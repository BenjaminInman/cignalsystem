// Lightweight, edge-safe vertical detection used by middleware.
//
// URL model (Oct 2026): every vertical lives in a subdirectory of the main
// domain — www.cignalsystem.com/multifamily, /investors, /realestate,
// /business — and the root (/) is the cross-vertical hub. The old per-vertical
// subdomains (multifamily.cignalsystem.com, ...) 301 to their subdirectory.
export const DEFAULT_VERTICAL = "multifamily";

// Canonical public site. Deliberately a constant, not NEXT_PUBLIC_SITE_URL:
// that env var may still hold the retired multifamily. subdomain.
export const SITE_URL = "https://www.cignalsystem.com";

// Pseudo-vertical used for the hub at "/".
export const HUB = "hub";

// Cookie remembering the last vertical a visitor browsed (drives the hub's
// "Continue to ..." bar and resolves un-prefixed links such as /dashboard).
export const VERTICAL_COOKIE = "cs_vertical";

const ALIASES = {
  multifamily: "multifamily",
  investor: "investor",
  investors: "investor",
  passive: "investor",
  singlefamily: "single-family",
  "single-family": "single-family",
  sfr: "single-family",
  realestate: "general-real-estate",
  "general-real-estate": "general-real-estate",
  generalrealestate: "general-real-estate",
  development: "real-estate-development",
  "real-estate-development": "real-estate-development",
  redevelopment: "real-estate-development",
  smallbusiness: "small-business",
  "small-business": "small-business",
  business: "small-business",
  personalfinance: "personal-finance",
  "personal-finance": "personal-finance",
};

// vertical slug -> public URL subdirectory (one canonical prefix per vertical)
export const VERTICAL_PATH = {
  multifamily: "multifamily",
  investor: "investors",
  "general-real-estate": "realestate",
  "single-family": "singlefamily",
  "small-business": "business",
  "real-estate-development": "development",
  "personal-finance": "personalfinance",
};

// public URL subdirectory -> vertical slug
const PATH_VERTICAL = Object.fromEntries(
  Object.entries(VERTICAL_PATH).map(([slug, path]) => [path, slug])
);

/** Strict: the vertical named by a cignalsystem.com subdomain, else null. */
export function verticalFromSubdomain(host) {
  if (!host) return null;
  const h = host.split(":")[0].toLowerCase();
  if (!h.endsWith("cignalsystem.com")) return null;
  const parts = h.split(".");
  const sub = parts.length >= 3 ? parts[0] : "";
  return ALIASES[sub] || null;
}

/** Legacy helper: subdomain vertical, defaulting to multifamily. */
export function verticalSlugFromHost(host) {
  return verticalFromSubdomain(host) || DEFAULT_VERTICAL;
}

/** Split "/multifamily/indicators" -> { vertical: "multifamily", rest: "/indicators" }. */
export function splitVerticalPath(pathname) {
  const m = /^\/([^/]+)(\/.*)?$/.exec(pathname || "/");
  if (!m) return { vertical: null, rest: pathname };
  const vertical = PATH_VERTICAL[m[1].toLowerCase()] || null;
  return vertical ? { vertical, rest: m[2] || "/" } : { vertical: null, rest: pathname };
}

/** Public URL path for an in-app path within a vertical: ("investor", "/dashboard") -> "/investors/dashboard". */
export function verticalHref(vertical, path = "/") {
  const prefix = VERTICAL_PATH[vertical];
  if (!prefix || typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) return path;
  if (path.startsWith("/api/") || path === "/api") return path;
  if (splitVerticalPath(path).vertical) return path; // already prefixed
  if (path === "/") return `/${prefix}`;
  if (path.startsWith("/?") || path.startsWith("/#")) return `/${prefix}${path.slice(1)}`;
  return `/${prefix}${path}`;
}
