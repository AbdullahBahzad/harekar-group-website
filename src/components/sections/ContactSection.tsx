import { useTranslations } from "next-intl";
import GoogleOfficeMap from "@/components/GoogleOfficeMap";
import OfficeList from "@/components/OfficeList";
import Reveal from "@/components/Reveal";
import SectionIntro from "@/components/SectionIntro";
import { pick, type getSiteContent } from "@/lib/site-content";
import type { Locale } from "@/i18n/routing";
import ContactForm from "@/app/[locale]/(site)/contact/ContactForm";

/**
 * Shared by the one-page scroll and the standalone /contact route.
 * `as` lets the standalone page promote the heading to an h1.
 *
 * `showMap` is off on the home page, where the office map already sits in the
 * Coverage section directly above — showing it twice in a row reads as a
 * mistake. The standalone /contact page keeps it.
 */
export default function ContactSection({
  as: Heading = "h2",
  content,
  locale,
  showMap = true,
}: {
  as?: "h1" | "h2";
  content: Awaited<ReturnType<typeof getSiteContent>>;
  locale: Locale;
  showMap?: boolean;
}) {
  const t = useTranslations("contact");
  const p = (field: string, fallback: string) =>
    pick(content, field, locale, fallback);

  return (
    <section id="contact" className="scroll-mt-24 bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-10">
      <div className="mx-auto max-w-360">
        <SectionIntro
          as={Heading}
          eyebrow={p("contactEyebrow", t("eyebrow"))}
          title={p("contactTitle", t("title"))}
          subtitle={p("contactSubtitle", t("subtitle"))}
        />

        {/*
         * Form first in the source order so keyboard and screen-reader users
         * reach the thing they came to do before the office details, while the
         * wide layout still shows them side by side.
         */}
        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-16">
          <Reveal
            delay={0.12}
            className="border-bone/10 bg-surface rounded-3xl border p-6 sm:p-10"
          >
            <ContactForm />
          </Reveal>

          <Reveal delay={0.18} className="lg:pt-2">
            <p className="text-bone/70 text-sm font-bold tracking-wide">
              {t("locationLabel")}
            </p>
            <div className="mt-5">
              <OfficeList />
            </div>
          </Reveal>
        </div>

        {showMap && (
          <Reveal delay={0.1} className="mt-16">
            <GoogleOfficeMap />
          </Reveal>
        )}
      </div>
    </section>
  );
}
