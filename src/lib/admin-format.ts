/**
 * Locale-aware formatting for the console.
 *
 * Two things this centralises that were previously scattered:
 *
 *  - **A deterministic locale.** Most call sites used `toLocaleDateString(undefined, …)`,
 *    which resolves to whatever the *server's* default locale happens to be and
 *    can differ from the browser's — the classic source of a hydration mismatch
 *    on a date. Every console format now names its locale explicitly.
 *
 *  - **Western digits in the RTL locales.** `ar-IQ` and `ckb` both default to
 *    Arabic-Indic numerals (٢٬٥٠٠). The console is a dense operational surface —
 *    money, counts, coordinates, percentages, `tabular-nums` columns that have to
 *    line up — and the reference figures an operator reconciles against (bank
 *    statements, payment-gateway dashboards, the coordinates on the map) are all
 *    Western. `-u-nu-latn` keeps the month names and word order fully localised
 *    while holding the digits steady.
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

/**
 * Minor units per major unit, by currency. Not universally 100 — every payment
 * API treats the Iraqi dinar as zero-decimal, so an IQD `amountMinor` is
 * already whole dinars and must not be divided. Mirrors `data/plans.ts`.
 */
const MINOR_UNITS: Record<string, number> = { USD: 100, IQD: 1 };

/** Formats a smallest-unit amount as a whole-unit currency string. */
export function formatMoney(
  amountMinor: number,
  currency: string,
  locale: string,
): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountMinor / (MINOR_UNITS[currency] ?? 100));
}
