import { notFound } from "next/navigation";

/**
 * Catches every unmatched path under a locale and hands it to the group's
 * `not-found.tsx`.
 *
 * Without this, an unmatched URL resolves at the root of `app/` and Next
 * renders the root `not-found.tsx` — which sits above the locale layout and so
 * has no translations, no fonts and no site chrome. `/ar/nonsense` came back
 * as an English page in an `lang="en" dir="ltr"` document.
 *
 * A catch-all is the least specific route Next will match, so it only ever
 * runs once every real page has been ruled out — `/en/contact` still reaches
 * `contact/page.tsx`.
 */
export default function CatchAllNotFound() {
  notFound();
}
