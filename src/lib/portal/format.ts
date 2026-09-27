/**
 * Locale-aware formatting for the client portal.
 *
 * A small deliberate duplicate of `intlLocale` in `lib/admin-format.ts` rather
 * than an import from it: that module is named and reasoned about as the
 * admin console's own formatter, and the portal is a separate authenticated
 * area with a separate audience (clients, not operators). Three lines copied
 * is cheaper than a module boundary that invites "why does the portal depend
 * on admin" later.
 */

/** Maps a routing locale onto the BCP-47 tag Intl should format with. */
export function intlLocale(locale: string): string {
  switch (locale) {
    case "ar":
      return "ar-IQ-u-nu-latn";
    case "ckb":
      return "ckb-u-nu-latn";
    default:
      return "en";
  }
}

export function formatDate(
  date: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(intlLocale(locale), options).format(date);
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(intlLocale(locale)).format(value);
}
