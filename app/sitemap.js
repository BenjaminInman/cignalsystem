const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://multifamily.cignalsystem.com";

// Public, indexable surfaces only. Authenticated Terminal routes (dashboard,
// portfolio, account, admin) are deliberately excluded and are disallowed in
// robots.js as well.
const ROUTES = [
  ["", 1.0, "hourly"],
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
  return ROUTES.map(([path, priority, changeFrequency]) => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
