import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";

/**
 * Best-effort publish date for a headline, for the date-range filter in the
 * console.
 *
 * There is no consistent signal across the eleven sources for this: one
 * exposes a machine-readable `datetime` attribute, one writes relative text
 * ("Today, 18:00") into a `<time>` tag, one embeds a date directly in the
 * headline text, and several expose nothing on the homepage at all — the
 * publish date only exists on the article page itself, which fetching for
 * every candidate headline would mean one extra request per story just to
 * maybe find a date. So this only reads what the homepage already hands
 * over; a headline with no detectable date comes back `null` and the range
 * filter leaves it alone rather than guessing it out of range.
 */

/** Searches outward from the link for a `<time>` element sharing its story card. */
function findNearbyTimeHint(
  $: CheerioAPI,
  anchor: Cheerio<AnyNode>,
): string | null {
  let container = anchor;
  for (let level = 0; level < 4; level++) {
    container = container.parent();
    if (container.length === 0) break;

    const time = container.find("time").first();
    if (time.length > 0) {
      const datetime = time.attr("datetime");
      if (datetime) return datetime;
      const text = time.text().trim();
      if (text) return text;
    }
  }
  return null;
}

/** A DD-MM-YYYY or YYYY-MM-DD run, the two formats seen embedded in a headline's own text. */
const EMBEDDED_DATE_PATTERN =
  /\b(\d{1,2})-(\d{1,2})-(\d{4})\b|\b(\d{4})-(\d{1,2})-(\d{1,2})\b/;

function toIsoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  // Rejects e.g. 31-02-2026: Date normalises it into March, which no longer
  // matches the day/month that was asked for.
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function relativeToIso(hint: string, now: Date): string | null {
  const lower = hint.toLowerCase();
  if (/\btoday\b/.test(lower) || /\bhours? ago\b/.test(lower) || /\bminutes? ago\b/.test(lower) || /\bjust now\b/.test(lower)) {
    return now.toISOString().slice(0, 10);
  }
  if (/\byesterday\b/.test(lower)) {
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    return yesterday.toISOString().slice(0, 10);
  }
  return null;
}

/** Turns whatever raw text was found near (or in) the headline into `YYYY-MM-DD`, or gives up. */
function parseDateHint(hint: string, now: Date): string | null {
  const relative = relativeToIso(hint, now);
  if (relative) return relative;

  const embedded = EMBEDDED_DATE_PATTERN.exec(hint);
  if (embedded) {
    if (embedded[1]) {
      // DD-MM-YYYY — the convention already used elsewhere in this codebase
      // (see the sample Daily Security Report's own "17/08/2025" dates).
      return toIsoDate(Number(embedded[3]), Number(embedded[2]), Number(embedded[1]));
    }
    // YYYY-MM-DD
    return toIsoDate(Number(embedded[4]), Number(embedded[5]), Number(embedded[6]));
  }

  // A real `datetime` attribute is usually already ISO-ish ("2026-09-07
  // 19:38:17") — let the platform parser take a shot at anything else.
  const parsed = new Date(hint);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

/**
 * Best-effort publish date for one headline. Checks a `<time>` element
 * sharing the story's card first, then falls back to a date pattern
 * embedded directly in the headline's own text (the only signal at all on
 * outlets that write e.g. "07-09-2026" straight into the title).
 */
export function detectHeadlineDate(
  $: CheerioAPI,
  anchor: Cheerio<AnyNode>,
  title: string,
  now: Date = new Date(),
): string | null {
  const nearby = findNearbyTimeHint($, anchor);
  if (nearby) {
    const parsed = parseDateHint(nearby, now);
    if (parsed) return parsed;
  }
  return parseDateHint(title, now);
}
