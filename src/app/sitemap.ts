import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/app-url";
import { locales, routing } from "@/i18n/routing";

/**
 * The public routes worth indexing, as paths under a locale.
 *
 * Deliberately a hand-kept list rather than a filesystem walk: the app
 * directory also holds the console, the auth pages, the account area and the
 * payment result screen, none of which should be advertised. An automatic
 * crawl of the routes would have to be taught all of those exceptions anyway,
 * and would quietly start listing the next private page somebody adds.
 */
const PUBLIC_PATHS = [
  "", // home
  "/services",
  "/clients",
  "/intelligence",
  "/faq",
  "/careers",
  "/contact",
  "/pro",
] as const;

/**
 * `sitemap.xml`, with one entry per page carrying every locale as an
 * alternate.
 *
 * The alternates matter more than the entries here: the same page exists at
 * three URLs, and without `hreflang` telling a search engine they are
 * translations of one another, they compete with each other instead of
 * consolidating — and Arabic and Kurdish readers get served the English one.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  const lastModified = new Date();

  const url = (locale: string, path: string) => `${origin}/${locale}${path}`;

  return PUBLIC_PATHS.flatMap((path) =>
    locales.map((locale) => ({
      url: url(locale, path),
      lastModified,
      // The home page is the entry point; everything else sits below it.
      priority: path === "" ? 1 : 0.7,
      changeFrequency: (path === "/intelligence"
        ? "daily"
        : "monthly") as MetadataRoute.Sitemap[number]["changeFrequency"],
      alternates: {
        languages: {
          ...Object.fromEntries(
            locales.map((alt) => [alt, url(alt, path)]),
          ),
          // Points at the default locale for a reader whose language matches
          // none of the three, rather than leaving the choice to the crawler.
          "x-default": url(routing.defaultLocale, path),
        },
      },
    })),
  );
}
