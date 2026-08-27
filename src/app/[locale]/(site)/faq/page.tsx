import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Reveal from "@/components/Reveal";
import { Link } from "@/i18n/navigation";
import { getSiteContent, pick } from "@/lib/site-content";
import { getPublishedFaqItems } from "@/lib/faq";
import type { Locale } from "@/i18n/routing";
import FaqAccordion from "./FaqAccordion";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });
  return { title: t("eyebrow"), description: t("subtitle") };
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "faq" });
  const content = await getSiteContent();
  const items = await getPublishedFaqItems(locale as Locale);
  const p = (field: string, fallback: string) =>
    pick(content, field, locale as Locale, fallback);

  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      {/*
       * Two columns rather than the old centred stack. The heading stays
       * pinned in the rail while the reader works down the questions, so the
       * list never scrolls away from what it belongs to.
       */}
      <div className="grid gap-12 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:gap-20">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-gold/80 text-xs tracking-[0.35em] uppercase">
            {p("faqEyebrow", t("eyebrow"))}
          </p>
          <h1 className="font-display text-bone mt-6 text-4xl leading-[1.15] font-light text-balance sm:text-5xl">
            {p("faqTitle", t("title"))}
          </h1>
          <p className="text-bone/60 mt-6 text-sm leading-relaxed text-pretty">
            {p("faqSubtitle", t("subtitle"))}
          </p>

          {/*
           * Same copy as before, minus the card. A hairline and the gold
           * heading carry the separation now, so the rail reads as one column
           * of type rather than a panel bolted under the intro.
           */}
          <div className="border-bone/10 mt-10 border-t pt-8">
            <p className="font-display text-bone text-lg font-medium">
              {p("faqCtaTitle", t("ctaTitle"))}
            </p>
            <p className="text-bone/55 mt-2 text-sm leading-relaxed text-pretty">
              {p("faqCtaBody", t("ctaBody"))}
            </p>
            <Link
              href="/contact"
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
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <FaqAccordion items={items} />
        </Reveal>
      </div>
    </section>
  );
}
