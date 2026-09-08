import * as cheerio from "cheerio";

/**
 * Isolates the article body from a news page, not just its visible text.
 *
 * The naive version of this — strip every tag, collapse whitespace — pulls
 * in the nav bar, the sidebar's "most read" widget, the newsletter signup,
 * and the footer's social links right alongside the actual story, all
 * mashed into one run-on paragraph with no boundary between "the article"
 * and "everything else on the page". For a page with heavy chrome that is
 * unusable as a report body, not just untidy.
 *
 * This instead: drops elements that are never article prose (nav, header,
 * footer, forms, scripts...) and elements whose class or id names the usual
 * culprits (menu, sidebar, newsletter, share, related, comments...), then
 * takes what is left over structured as paragraphs — preserving the
 * boundaries between them — rather than one flattened blob.
 */

const STRUCTURAL_TAGS =
  "script, style, noscript, iframe, form, nav, header, footer, aside";

/**
 * Class/id substrings that mark a container as chrome rather than prose.
 * Matched case-insensitively against the *combined* class+id string, so
 * this catches "sidebar-widget", "site-nav", "newsletterForm", etc.
 */
const NOISE_PATTERN =
  /nav|menu|sidebar|widget|newsletter|subscribe|social|share|comment|related|footer|breadcrumb|cookie|advert|banner|promo|popup|modal|masthead|pagination|tag-list|taxonomy/i;

/** A paragraph shorter than this is a caption, byline, or label, not prose. */
const MIN_PARAGRAPH_LENGTH = 40;

/** How much article text is worth keeping — Claude's context, or a bulletin body either way. */
const MAX_LENGTH = 6000;

function cleanText(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

export function extractArticleText(html: string): string {
  const $ = cheerio.load(html);

  $(STRUCTURAL_TAGS).remove();
  $("[class], [id]").each((_, el) => {
    const node = $(el);
    const signature = `${node.attr("class") ?? ""} ${node.attr("id") ?? ""}`;
    if (NOISE_PATTERN.test(signature)) node.remove();
  });

  const paragraphs = $("p")
    .map((_, el) => cleanText($(el).text()))
    .get()
    .filter((text) => text.length >= MIN_PARAGRAPH_LENGTH);

  if (paragraphs.length > 0) {
    return paragraphs.join("\n\n").slice(0, MAX_LENGTH);
  }

  /*
   * No paragraph survived — either the page genuinely has none (some sites
   * lay out article text in bare `<div>`s) or the noise removal above was
   * too aggressive for this particular markup. Falling back to whatever
   * text remains after stripping tags is worse prose but still better than
   * an empty body silently sending the analyst to write it from scratch.
   */
  return cleanText($.root().text()).slice(0, MAX_LENGTH);
}
