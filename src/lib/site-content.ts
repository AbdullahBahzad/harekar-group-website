import { prisma } from "@/lib/prisma";
import type { Locale } from "@/i18n/routing";

type SiteContentRow = NonNullable<
  Awaited<ReturnType<typeof prisma.siteContent.findUnique>>
>;

/**
 * The singleton row of editable page copy, or null if it has never been
 * saved or the database is unreachable — callers fall back to the shipped
 * translations in that case, the same way the intelligence map falls back to
 * its static markers when its own table is empty.
 */
export async function getSiteContent(): Promise<SiteContentRow | null> {
  try {
    return await prisma.siteContent.findUnique({ where: { id: "site" } });
  } catch (error) {
    console.error("Falling back to static site content", error);
    return null;
  }
}

const suffix: Record<Locale, "En" | "Ar" | "Ku"> = {
  en: "En",
  ar: "Ar",
  ckb: "Ku",
};

/**
 * Resolves one field for the current locale: the row's own column for that
 * locale, falling back to its English column, falling back to whatever the
 * caller already has from the message catalogues.
 *
 * `field` is the column prefix (e.g. `"heroTitle"` for `heroTitleEn` /
 * `heroTitleAr` / `heroTitleKu`) — a plain string index rather than a typed
 * key, because the caller picks the field dynamically per section and typing
 * out every combination here would just restate the schema.
 */
export function pick(
  row: SiteContentRow | null,
  field: string,
  locale: Locale,
  fallback: string,
): string {
  if (!row) return fallback;
  const values = row as unknown as Record<string, string | null>;
  return values[`${field}${suffix[locale]}`] || values[`${field}En`] || fallback;
}
