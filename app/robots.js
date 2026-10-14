import { SITE_URL as SITE } from "@/lib/vertical-slug";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Gated surfaces and machinery — nothing here is useful to a crawler.
        // Pages live under a market subdirectory (/multifamily/dashboard), so
        // the wildcard forms cover every market.
        disallow: [
          "/api/",
          "/*/admin", "/*/account", "/*/portfolio", "/*/dashboard", "/*/auth/",
          "/admin", "/account", "/portfolio", "/dashboard", "/auth/",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
