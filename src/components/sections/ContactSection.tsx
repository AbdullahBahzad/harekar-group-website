import { useTranslations } from "next-intl";
import ContactOffices from "@/components/ContactOffices";
import Reveal from "@/components/Reveal";
import RevealText from "@/components/RevealText";
import { pick, type getSiteContent } from "@/lib/site-content";
import type { Locale } from "@/i18n/routing";
import ContactForm from "@/app/[locale]/(site)/contact/ContactForm";

/**
 * Shared by the one-page scroll and the standalone /contact route.
 * `as` lets the standalone page promote the heading to an h1.
 *
 * The office locations live here — a tab per office, the form beside the
 * chosen office's map — in place of a separate coverage section.
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
    <section id="contact" className="scroll-mt-24 bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="text-gold-deep text-base font-bold">{p("contactEyebrow", t("eyebrow"))}</p>
          </Reveal>
          <RevealText
            as={Heading}
            text={p("contactTitle", t("title"))}
            className="font-display text-bone mt-3 text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl"
          />
          <Reveal delay={0.1}>
            <p className="text-bone/75 mt-4 text-lg leading-relaxed text-pretty">
              {p("contactSubtitle", t("subtitle"))}
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.15} className="mt-10">
          <ContactOffices>
            <ContactForm />
          </ContactOffices>
        </Reveal>
      </div>
    </section>
  );
}
