import { getTranslations, getLocale } from "next-intl/server";
import Reveal from "@/components/Reveal";
import { getSiteContent, pick } from "@/lib/site-content";
import { getPublishedFaqItems } from "@/lib/faq";
import type { Locale } from "@/i18n/routing";
import FaqAccordion from "@/app/[locale]/(site)/faq/FaqAccordion";

/**
 * Shared by the one-page scroll and the standalone /faq route.
 * `as` lets the standalone page promote the heading to an h1.
 */
export default async function FaqSection({
  as: Heading = "h2",
}: {
  as?: "h1" | "h2";
}) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("faq");
  const content = await getSiteContent();
  const items = await getPublishedFaqItems(locale);
  const p = (field: string, fallback: string) =>
    pick(content, field, locale, fallback);

  return (
    <section id="faq" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
      {/*
       * Two columns rather than a centred stack. The heading stays pinned in
       * the rail while the reader works down the questions, so the list never
       * scrolls away from what it belongs to.
       */}
      <div className="grid gap-12 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:gap-20">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-gold text-3xl font-semibold tracking-[0.1em] uppercase sm:text-4xl lg:text-5xl">
            {p("faqEyebrow", t("eyebrow"))}
          </p>
          <Heading className="font-display text-bone mt-5 text-2xl leading-snug font-normal text-balance sm:text-3xl lg:text-4xl">
            {p("faqTitle", t("title"))}
          </Heading>
          <p className="text-bone/70 mt-6 text-sm leading-relaxed text-pretty">
            {p("faqSubtitle", t("subtitle"))}
          </p>

          <div className="border-bone/14 mt-10 border-t pt-8">
            <p className="font-display text-bone text-lg font-medium">
              {p("faqCtaTitle", t("ctaTitle"))}
            </p>
            <p className="text-bone/65 mt-2 text-sm leading-relaxed text-pretty">
              {p("faqCtaBody", t("ctaBody"))}
            </p>
            {/* An in-page jump now that contact is a section of the same
                document rather than a separate route. */}
            <a
              href="#contact"
              className="text-gold hover:text-gold-bright group mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium transition-colors"
            >
              {t("cta")}
              <svg
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 rtl:rotate-180"
                fill="none"
                aria-hidden
              >
                <path
                  d="M1 8h14M15 8l-6-6M15 8l-6 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <FaqAccordion items={items} />
        </Reveal>
      </div>
    </section>
  );
}
