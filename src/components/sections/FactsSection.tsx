import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Reveal from "@/components/Reveal";
import CountUp from "@/components/CountUp";
import RevealText from "@/components/RevealText";
import { companyStats, FOUNDED_YEAR } from "@/data/company-stats";

/**
 * The company's published figures — people, vehicles and active units — each
 * under a thin gold rule, counting up as they scroll into view. Shared by the
 * home page band below and the About page, so both always show the same
 * numbers.
 */
export function StatsGrid() {
  const t = useTranslations("stats");

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
      {companyStats.map((stat, i) => (
        <Reveal key={stat.id} delay={0.04 * i}>
          <div className="border-gold flex flex-col-reverse justify-end border-s-2 ps-4">
            <dt className="text-bone/75 mt-2 text-sm leading-snug font-medium sm:text-base">
              {t(`items.${stat.id}`)}
            </dt>
            <dd
              dir="ltr"
              className="text-gold-deep text-start text-4xl leading-none font-light tracking-tight tabular-nums sm:text-5xl rtl:text-end"
            >
              <CountUp value={stat.value} />
            </dd>
          </div>
        </Reveal>
      ))}
    </dl>
  );
}

/**
 * Directly beneath the opening section: the headline with its highlighted
 * close, a short company introduction beside it, and the figures beneath.
 * Carries the `about` anchor the header's About entry scrolls to. The full
 * statement, mission and vision live on the About page.
 */
export default function FactsSection() {
  const t = useTranslations("facts");
  const tStats = useTranslations("stats");

  return (
    <section id="about" className="scroll-mt-24 bg-white px-4 pt-20 pb-20 sm:px-6 sm:pt-24 lg:px-10">
      <div className="mx-auto max-w-360">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-16">
          <div className="lg:col-span-7">
            <Reveal>
              <p className="text-gold-deep text-base font-bold">
                {tStats("since", { year: FOUNDED_YEAR })}
              </p>
            </Reveal>
            <RevealText
              text={tStats("title")}
              highlight={tStats("titleHighlight")}
              className="font-display text-bone mt-3 text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl"
            />
          </div>

          <Reveal delay={0.1} className="lg:col-span-5">
            <p className="text-bone/80 text-lg leading-relaxed text-pretty">{t("intro")}</p>
            <Link
              href="/about"
              className="text-bone hover:text-gold-deep group mt-4 inline-flex min-h-11 items-center gap-2 text-base font-bold transition-colors"
            >
              {t("more")}
              <svg
                viewBox="0 0 16 16"
                className="size-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
                fill="none"
                aria-hidden
              >
                <path
                  d="M1 8h14M15 8l-6-6M15 8l-6 6"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </Reveal>
        </div>

        <hr className="border-bone/12 mt-12 mb-12" />

        <StatsGrid />
      </div>
    </section>
  );
}
