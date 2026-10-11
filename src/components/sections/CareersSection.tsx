import { useTranslations } from "next-intl";
import Reveal from "@/components/Reveal";
import SectionIntro from "@/components/SectionIntro";
import InfoCard from "@/components/InfoCard";
import { pick, type getSiteContent } from "@/lib/site-content";
import type { getPublishedCareerBenefits } from "@/lib/career-benefits";
import type { Locale } from "@/i18n/routing";
import ApplyForm from "@/app/[locale]/(site)/careers/ApplyForm";

/**
 * Shared by the one-page scroll and the standalone /careers route.
 * `as` lets the standalone page promote the heading to an h1.
 *
 * `content` and `benefits` are fetched by the caller — see the note in
 * `AboutSection` for why an `await` cannot sit beside `useTranslations`.
 */
export default function CareersSection({
  as: Heading = "h2",
  content,
  benefits,
  locale,
}: {
  as?: "h1" | "h2";
  content: Awaited<ReturnType<typeof getSiteContent>>;
  benefits: Awaited<ReturnType<typeof getPublishedCareerBenefits>>;
  locale: Locale;
}) {
  const t = useTranslations("careers");
  const tApply = useTranslations("careers.apply");
  const p = (field: string, fallback: string) =>
    pick(content, field, locale, fallback);

  return (
    <>
      <section id="careers" className="scroll-mt-24 bg-white px-4 pt-20 pb-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            as={Heading}
            eyebrow={p("careersEyebrow", t("eyebrow"))}
            title={p("careersTitle", t("title"))}
          >
            <a
              href="#apply"
              className="bg-gold text-ink hover:bg-gold-bright mt-8 inline-flex min-h-12 items-center rounded-full px-7 text-base font-bold transition-colors"
            >
              {tApply("title")}
            </a>
          </SectionIntro>

          <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit, i) => (
              <li key={benefit.id} className="h-full">
                <Reveal delay={0.06 * i} className="h-full">
                  <InfoCard
                    index={String(i + 1).padStart(2, "0")}
                    title={benefit.title}
                    body={benefit.body}
                  />
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="apply" className="bg-surface scroll-mt-24 px-4 pt-16 pb-24 sm:px-6">
        {/*
          One centred column rather than a heading rail beside the form: the
          label, the title and the application card stack down the middle of
          the page. `max-w-3xl` keeps the card from stretching to the full
          6xl content width, which is far wider than a form wants to be.

          The single-column track is spelled out rather than left implicit. A
          grid item defaults to `min-width: auto`, so an implicit track refuses
          to shrink below its content's minimum — here the letter-spaced
          uppercase eyebrow — and on a 320px screen that pushed the whole page
          three pixels wider than the viewport.
        */}
        <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-10">
          <Reveal className="text-center">
            {/* A sub-section of Careers, so its label stays subordinate to
                the page head title above rather than matching it. */}
            <p className="text-gold-deep text-sm font-bold tracking-wide">
              {tApply("eyebrow")}
            </p>
            <h3 className="font-display text-bone mt-5 text-2xl leading-snug font-bold text-balance sm:text-3xl">
              {tApply("title")}
            </h3>
          </Reveal>

          <ApplyForm />
        </div>
      </section>
    </>
  );
}
