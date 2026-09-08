import { useTranslations } from "next-intl";
import Reveal from "@/components/Reveal";
import { GradientCard } from "@/components/ui/gradient-card";
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
      <section
        id="careers"
        className="mx-auto max-w-6xl scroll-mt-24 px-6 pt-24 pb-16"
      >
        <Reveal className="max-w-3xl">
          <p className="text-gold text-3xl font-semibold tracking-[0.1em] uppercase sm:text-4xl lg:text-5xl">
            {p("careersEyebrow", t("eyebrow"))}
          </p>
          <Heading className="font-display text-bone mt-5 text-2xl leading-snug font-normal text-balance sm:text-3xl lg:text-4xl">
            {p("careersTitle", t("title"))}
          </Heading>
          <a
            href="#apply"
            className="border-gold/60 text-gold hover:bg-gold hover:text-ink mt-10 inline-flex min-h-11 items-center rounded-full border px-7 text-sm transition-colors"
          >
            {tApply("title")}
          </a>
        </Reveal>

        {/* Five across on desktop so the whole argument reads as one line;
            stacking only where 200px-wide columns would stop being legible. */}
        <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {benefits.map((benefit, i) => (
            <li key={benefit.id} className="h-full">
              <Reveal delay={0.06 * i} className="h-full">
                <GradientCard
                  index={String(i + 1).padStart(2, "0")}
                  title={benefit.title}
                  body={benefit.body}
                />
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section id="apply" className="scroll-mt-24 px-6 pt-8 pb-28">
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
            <p className="text-gold/88 text-xs font-semibold tracking-[0.3em] uppercase">
              {tApply("eyebrow")}
            </p>
            <h3 className="font-display text-bone mt-5 text-2xl leading-snug font-normal text-balance sm:text-3xl">
              {tApply("title")}
            </h3>
          </Reveal>

          <ApplyForm />
        </div>
      </section>
    </>
  );
}
