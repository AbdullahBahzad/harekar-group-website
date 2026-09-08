import { useTranslations } from "next-intl";
import GoogleOfficeMap from "@/components/GoogleOfficeMap";
import OfficeList from "@/components/OfficeList";
import Reveal from "@/components/Reveal";
import { pick, type getSiteContent } from "@/lib/site-content";
import type { Locale } from "@/i18n/routing";
import ContactForm from "@/app/[locale]/(site)/contact/ContactForm";

/**
 * Shared by the one-page scroll and the standalone /contact route.
 * `as` lets the standalone page promote the heading to an h1.
 */
export default function ContactSection({
  as: Heading = "h2",
  content,
  locale,
}: {
  as?: "h1" | "h2";
  content: Awaited<ReturnType<typeof getSiteContent>>;
  locale: Locale;
}) {
  const t = useTranslations("contact");
  const p = (field: string, fallback: string) =>
    pick(content, field, locale, fallback);

  return (
    <section id="contact" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
      <Reveal className="max-w-2xl">
        <p className="text-gold text-3xl font-semibold tracking-[0.1em] uppercase sm:text-4xl lg:text-5xl">
          {p("contactEyebrow", t("eyebrow"))}
        </p>
        <Heading className="font-display text-bone mt-5 text-2xl leading-snug font-normal text-balance sm:text-3xl lg:text-4xl">
          {p("contactTitle", t("title"))}
        </Heading>
        <p className="text-bone/70 mt-6 text-base leading-relaxed text-pretty">
          {p("contactSubtitle", t("subtitle"))}
        </p>
      </Reveal>

      {/*
       * Form first in the source order so keyboard and screen-reader users
       * reach the thing they came to do before the orientation graphic, while
       * the wide layout still shows them side by side.
       */}
      <div className="mt-14 grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-20">
        <Reveal delay={0.12}>
          <ContactForm />
        </Reveal>

        <Reveal delay={0.18} className="lg:pt-2">
          <p className="text-bone/58 text-xs tracking-[0.28em] uppercase">
            {t("locationLabel")}
          </p>
          <div className="mt-6">
            <OfficeList />
          </div>
        </Reveal>
      </div>

      {/*
       * The map runs the full width rather than sharing the column with the
       * form. Squeezed into a side column it rendered barely 400px across,
       * where Google's own controls, attribution and labels crowd out the
       * streets — at that size it stops being a map and becomes a thumbnail.
       */}
      <Reveal delay={0.1} className="mt-20">
        <GoogleOfficeMap />
      </Reveal>
    </section>
  );
}
