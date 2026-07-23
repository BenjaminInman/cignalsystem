// Per-vertical configuration. multifamily is fully built; the others are
// scaffolded (ready: false) and resolve to a branded "coming soon" until
// their content (indicators, news, data, assessment) is authored.

export const DEFAULT_VERTICAL = "multifamily";

export const VERTICALS = {
  multifamily: {
    slug: "multifamily",
    label: "Multifamily",
    system: "Cignal System",
    title: "Cignal System — Market Intelligence for Multifamily",
    description:
      "Cignal System surfaces the leading and trailing signals that move the multifamily real estate market — before they hit the headlines.",
    accent: "#F5B544",
    ready: true,
  },
  investor: {
    slug: "investor",
    label: "Investor",
    system: "Cignal System",
    title: "Cignal System — Market Intelligence for Multifamily Investors",
    description:
      "Cignal System surfaces the leading and trailing signals that move the multifamily market — read the cycle before you deploy capital into a deal.",
    accent: "#F5B544",
    ready: true,
    // Investor is a marketing relabel of the multifamily vertical: identical
    // data, roster, and metros, framed for LP/GP investors. It inherits every
    // multifamily content bundle except an investor-forward COPY override
    // (lib/content/investor.js). No `pages` restrictions -> all tools live.
    blurb: "The same signals engine that moves the multifamily market — read for investors deciding when to deploy.",
  },
  "general-real-estate": {
    slug: "general-real-estate",
    label: "Real Estate",
    system: "Cignal System",
    title: "Cignal System — Market Intelligence for Real Estate",
    description: "Market-cycle intelligence for the broader real estate market.",
    accent: "#F5B544",
    ready: true,
    blurb: "Cycle intelligence for the broader real estate market — the same signals engine, tuned to general real estate.",
    // Operator tools not yet adapted for this vertical render an inline "coming soon".
    pages: { research: false, community: false },
  },
  "real-estate-development": {
    slug: "real-estate-development",
    label: "Real Estate Development",
    system: "Cignal System",
    title: "Cignal System — Market Intelligence for Real Estate Development",
    description: "Market-cycle intelligence for real estate development.",
    accent: "#F5B544",
    ready: false,
    blurb: "Time entitlements, starts, and deliveries to the cycle — development-grade signal intelligence.",
  },
  "small-business": {
    slug: "small-business",
    label: "Small Business",
    system: "Cignal System",
    title: "Cignal System — Market Intelligence for Small Business",
    description: "Market-cycle intelligence for small-business owners and operators.",
    accent: "#F5B544",
    ready: false,
    blurb: "Read the economic cycle the way operators should — small-business signal intelligence.",
  },
  "personal-finance": {
    slug: "personal-finance",
    label: "Personal Finance",
    system: "Cignal System",
    title: "Cignal System — Market Intelligence for Personal Finance",
    description: "Market-cycle intelligence for personal finance and investing decisions.",
    accent: "#F5B544",
    ready: false,
    blurb: "Time your financial decisions to the cycle — personal-finance signal intelligence.",
  },
};

export function getVerticalConfig(slug) {
  return VERTICALS[slug] || VERTICALS[DEFAULT_VERTICAL];
}

// Per-page readiness within a vertical. Defaults to ready unless explicitly false.
export function isPageReady(vertical, page) {
  if (!vertical || !vertical.pages) return true;
  return vertical.pages[page] !== false;
}
