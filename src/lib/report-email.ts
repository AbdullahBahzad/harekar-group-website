/**
 * The wording of a Daily Security Report email, in one place.
 *
 * The Client Emailing console shows a preview of the message before it is sent,
 * and the server action composes the real one. If each spelled the text out
 * itself, the preview would quietly drift from what clients receive — the one
 * thing a preview must not do — so both read from here.
 *
 * English only, on purpose: the console is localised, but the mail goes to
 * clients and is not.
 */

/** Used when the operator writes no message of their own. */
export const DEFAULT_REPORT_NOTE =
  "Please find attached the Daily Security Report.";

export function reportEmailSubject(dateLabel: string): string {
  return `Harekar Group — Daily Security Report — ${dateLabel}`;
}

/**
 * `harekar-daily-security-report-2026-11-02-with-sources.pdf` — the same name
 * the console and portal downloads use, so a client can tell the two versions
 * apart whichever way the PDF reached them.
 */
export function reportEmailFilename(dateLabel: string, withSources: boolean): string {
  return `harekar-daily-security-report-${dateLabel}-${
    withSources ? "with-sources" : "without-sources"
  }.pdf`;
}

/** Falls back to a plain "Hello," so a client saved without a first name is
 * not greeted as "Hi null,". */
export function reportEmailGreeting(firstName: string | null): string {
  return firstName ? `Hi ${firstName},` : "Hello,";
}

export function reportEmailBody(
  firstName: string | null,
  note: string,
): string {
  return [
    reportEmailGreeting(firstName),
    "",
    note.trim() || DEFAULT_REPORT_NOTE,
    "",
    "— Harekar Group",
  ].join("\n");
}
