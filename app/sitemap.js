import { SITE_URL as SITE } from "@/lib/vertical-slug";

// The hub lives at "/" and each market in its own subdirectory. Multifamily is
// the flagship, so all of its public pages are listed; the other live markets
// list their home pages (they share multifamily's data pages, so listing every
// page would hand Google near-duplicates).
const MF = "/multifamily";
const OTHER_MARKETS = ["/investors", "/realestate"];

// Public, indexable surfaces only. Authenticated Terminal routes (dashboard,
// portfolio, account, admin) are deliberately excluded and are disallowed in
// robots.js as well.
const ROUTES = [
  ["", 0.9, "hourly"],
  ["/about", 0.7, "monthly"],
  ["/indicators", 0.9, "daily"],
  ["/market-maps", 0.8, "daily"],
  ["/forecasts", 0.8, "daily"],
  ["/signals", 0.8, "daily"],
  ["/news", 0.9, "hourly"],
  ["/indices", 0.6, "daily"],
  ["/where-are-we", 0.7, "weekly"],
  ["/cignalscore", 0.7, "monthly"],
  ["/research", 0.6, "weekly"],
  ["/community", 0.5, "weekly"],
  ["/faq", 0.5, "monthly"],
  ["/upgrade", 0.6, "monthly"],
  ["/login", 0.3, "yearly"],
  ["/register", 0.4, "yearly"],
  ["/terms", 0.2, "yearly"],
  ["/privacy", 0.2, "yearly"],
  ["/disclaimer", 0.2, "yearly"],
];

export default function sitemap() {
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    ...ROUTES.map(([path, priority, changeFrequency]) => ({
      url: `${SITE}${MF}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    })),
    ...OTHER_MARKETS.map((m) => ({ url: `${SITE}${m}`, lastModified: now, changeFrequency: "daily", priority: 0.8 })),
  ];
}
