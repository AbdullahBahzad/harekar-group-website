import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Manrope, Noto_Sans_Arabic } from "next/font/google";
import { getDirection, routing, type Locale } from "@/i18n/routing";

// The brand typeface for English: bold headings, plain body text.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

/*
 * Carries both Arabic and Kurdish Sorani, which share the Arabic script.
 * Noto Sans Arabic covers the Sorani-specific letters (ڕ ڵ ۆ ێ ە ڤ گ چ پ ژ)
 * that some Arabic-only faces are missing.
 */
const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "brand" });

  return {
    title: {
      default: t("name"),
      template: `%s — ${t("name")}`,
    },
    description:
      "Security, emergency response, and operational services for organizations that cannot afford uncertainty.",
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  /*
   * The console's strings are withheld from this provider.
   *
   * `NextIntlClientProvider` serialises whatever it is given into the HTML of
   * every page beneath it, and with no `messages` prop that is the entire
   * catalogue — so each anonymous visit to the marketing site was carrying
   * several hundred admin console labels it can never render, in the reader's
   * language, on every page. The admin layout re-provides the full set for the
   * subtree that actually needs it.
   *
   * This is a payload decision, not a security one: these are UI labels, and
   * nothing in `admin` is a secret. It is simply not the public's to download.
   */
  const publicMessages = Object.fromEntries(
    Object.entries(await getMessages()).filter(([ns]) => ns !== "admin"),
  );

  return (
    <html
      lang={locale}
      dir={getDirection(locale as Locale)}
      className={`${manrope.variable} ${notoArabic.variable} h-full antialiased`}
    >
      {/*
       * Deliberately bare: this layout owns the document, the fonts and the
       * locale, and nothing else. The public site's header and footer live in
       * `(site)/layout.tsx` so the admin console, which sits outside that
       * group, does not inherit marketing chrome.
       */}
      <body className="bg-ink text-bone min-h-full">
        <NextIntlClientProvider messages={publicMessages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
