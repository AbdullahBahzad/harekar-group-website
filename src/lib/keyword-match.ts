/**
 * Keyword matching for the Sources station's keyword fetching.
 *
 * Client-safe (no server imports): the console uses it to preview a
 * keyword list, the server to filter fetched headlines.
 *
 * Text and keywords are normalised the same way before comparing, so one
 * keyword finds the spellings the sources actually use:
 *  - case and width folded (NFKC, lower case);
 *  - Arabic alef forms (أ إ آ ٱ) read as ا, alef maqsura ى and Kurdish ی as
 *    ي, Kurdish ک as ك, taa marbuta ة and Kurdish ە as ه, and the Kurdish
 *    ۆ ێ ڵ ڕ as و ي ل ر (often typed without their marks);
 *  - harakat, tatweel and zero-width joiners removed.
 *
 * Latin keywords match at the start of a word ("oil" finds "oil" and
 * "oilfield", not "turmoil"). Arabic-script keywords match anywhere in a
 * word, because Arabic and Kurdish attach prefixes to the word itself
 * (و، ب، ال، لە…), so a word boundary would miss most real matches.
 */

export function normalise(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640\u200C\u200D]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[ىی]/g, "ي")
    .replace(/ک/g, "ك")
    .replace(/[ةە]/g, "ه")
    // Kurdish letters that people often type as their plain Arabic form.
    .replace(/ۆ/g, "و")
    .replace(/ێ/g, "ي")
    .replace(/ڵ/g, "ل")
    .replace(/ڕ/g, "ر")
    .replace(/\s+/g, " ")
    .trim();
}

const LATIN = /^[a-z0-9]/;
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Cleans a keyword list as typed: trimmed, de-duplicated, blanks dropped. */
export function cleanKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of keywords) {
    const keyword = raw.trim().replace(/\s+/g, " ");
    const key = normalise(keyword);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(keyword);
  }
  return out;
}

function hits(normalisedText: string, keyword: string): boolean {
  const key = normalise(keyword);
  if (!key) return false;
  if (LATIN.test(key)) {
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escape(key)}`, "u").test(normalisedText);
  }
  return normalisedText.includes(key);
}

/**
 * Which include keywords a text contains, and whether it contains any
 * exclude keyword. With no include keywords every text "matches" (the list
 * is then only an exclusion filter).
 */
export function matchKeywords(
  text: string,
  include: string[],
  exclude: string[],
): { matched: string[]; excluded: boolean } {
  const normalisedText = normalise(text);
  return {
    matched: include.filter((keyword) => hits(normalisedText, keyword)),
    excluded: exclude.some((keyword) => hits(normalisedText, keyword)),
  };
}
