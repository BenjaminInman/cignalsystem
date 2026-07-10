const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://multifamily.cignalsystem.com";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Gated surfaces and machinery — nothing here is useful to a crawler.
        disallow: ["/api/", "/admin", "/account", "/portfolio", "/dashboard", "/auth/"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
