import * as cheerio from "cheerio";
import { safeFetchText } from "@/lib/safe-fetch";

export type Headline = { title: string; url: string };

/**
 * Path segments that mark a link as a section index or taxonomy page rather
 * than a story — a listing an operator would never want to draft from.
 * Deliberately short: "categories" is excluded from this list on purpose,
 * because on at least one of the eleven sources a real article URL is
 * `/categories/<name>/<id>`, and excluding the segment would drop every
 * story from that outlet.
 */
const BLOCKED_SEGMENTS = new Set(["tag", "tags", "author", "authors"]);

/**
 * A generic (not per-site) guess at whether a URL points to a story rather
 * than a homepage, a nav link, or a listing page.
 *
 * There is no site-specific scraper here — the eleven outlets this draws
 * from are different enough in markup that hand-tuning eleven scrapers would
 * be eleven things to keep working as each site redesigns. What holds across
 * nearly every news CMS instead: an article URL carries either a long
 * hyphenated slug or a numeric id, and a listing page usually carries
 * neither.
 */
function looksLikeArticlePath(pathname: string): boolean {
  if (pathname === "/" || pathname === "") return false;
  const segments = pathname.toLowerCase().split("/").filter(Boolean);
  if (segments.some((s) => BLOCKED_SEGMENTS.has(s))) return false;
  const hyphens = (pathname.match(/-/g) ?? []).length;
  const hasLongDigitRun = /\d{3,}/.test(pathname);
  return hyphens >= 2 || hasLongDigitRun;
}

/** Cap per source — a homepage check, not a full crawl. */
const MAX_HEADLINES_PER_SOURCE = 15;

/**
 * Pulls candidate headlines off a news homepage.
 *
 * Selecting *which* of these matter for the bulletin stays a human decision
 * (see `reports.ts`) — this only replaces visiting each site and copying a
 * link by hand with a checklist of what is already on the front page.
 *
 * No headline text is invented: it comes from stripping tags out of the
 * anchor's own markup, joining what was several inline elements (a category
 * label, a date, the title) with spaces rather than cheerio's `.text()`,
 * which concatenates them with none.
 */
export async function fetchHeadlines(sourceUrl: string): Promise<Headline[]> {
  const html = await safeFetchText(sourceUrl);
  if (!html) return [];

  let base: URL;
  try {
    base = new URL(sourceUrl);
  } catch {
    return [];
  }

  const $ = cheerio.load(html);
  const seen = new Map<string, string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    let url: URL;
    try {
      url = new URL(href, base);
    } catch {
      return;
    }
    if (url.origin !== base.origin) return;
    if (url.origin + url.pathname === base.origin + base.pathname) return;
    if (!looksLikeArticlePath(url.pathname)) return;

    const innerHtml = $(el).html() ?? "";
    const title = innerHtml
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();

    if (title.length < 15 || title.length > 180) return;
    if (!title.includes(" ")) return;

    const key = url.origin + url.pathname;
    if (!seen.has(key)) seen.set(key, title);
  });

  return Array.from(seen, ([url, title]) => ({ title, url })).slice(
    0,
    MAX_HEADLINES_PER_SOURCE,
  );
}
