import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/app-url";
import { locales } from "@/i18n/routing";

/**
 * `robots.txt`.
 *
 * The admin console already sends `noindex` in its own metadata, but that only
 * works once a crawler has fetched the page — it says "do not list this", not
 * "do not come here". Listing the paths here keeps well-behaved crawlers off
 * the signed-in surface entirely, and off the endpoints where a GET is either
 * meaningless or personal.
 *
 * Every path is written per locale rather than with a `*` wildcard: wildcards
 * in `Disallow` are a Google extension, not part of the original standard, and
 * there are only three locales to spell out.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();

  // Signed-in, personal, or transactional — none of it belongs in an index.
  const privatePaths = [
    "/admin",
    "/account",
    "/login",
    "/register",
    "/pro/result",
  ];

  const disallow = [
    "/api/",
    ...locales.flatMap((locale) =>
      privatePaths.map((path) => `/${locale}${path}`),
    ),
  ];

  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
    sitemap: `${origin}/sitemap.xml`,
  };
}
