import { defineRouting } from "next-intl/routing";

export const locales = ["en", "ar", "ckb"] as const;
export type Locale = (typeof locales)[number];

/** Locales written right-to-left. Kurdish Sorani uses the Arabic script. */
export const rtlLocales: Locale[] = ["ar", "ckb"];

export function getDirection(locale: Locale) {
  return rtlLocales.includes(locale) ? "rtl" : "ltr";
}

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  // Every locale carries its prefix, including the default, so URLs stay
  // predictable when the portal routes land later.
  localePrefix: "always",
});
