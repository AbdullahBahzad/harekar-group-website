import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Reveal from "@/components/Reveal";
import { pick, type getSiteContent } from "@/lib/site-content";
import type { Locale } from "@/i18n/routing";

type SiteContentRow = Awaited<ReturnType<typeof getSiteContent>>;

/**
 * The company figures.
 *
 * TODO: the shipped values in the message catalogues (15+, 800+, 120+, 24/7)
 * are placeholders. The client asked for *verified* facts here — confirm each
 * figure with Harekar Group and save it in the admin console (Site content →
 * stats), which overrides the shipped value without a deploy.
 */
const stats = ["experience", "personnel", "sites", "coverage"] as const;

/** Prefixes into `SiteContent`, one per stat, in display order. */
const statFields = {
  experience: "statExperience",
  personnel: "statPersonnel",
  sites: "statSites",
  coverage: "statCoverage",
} as const;

/**
 * The four figures, resolved: the console's saved value first, the shipped
 * catalogue value otherwise. The figure itself (`15+`, `24/7`) isn't
 * per-locale — only its label is.
 */
function useFacts(content: SiteContentRow) {
  const tProof = useTranslations("proof");
  const locale = useLocale() as Locale;
  const rowValues = content as unknown as Record<string, string | null> | null;

  return stats.map((stat) => {
    const field = statFields[stat];
    return {
      id: stat,
      value: rowValues?.[`${field}Value`] || tProof(`stats.${stat}.value`),
      label: pick(content, `${field}Label`, locale, tProof(`stats.${stat}.label`)),
    };
  });
}

/** The four figures as a 2×2 grid of cards — used on the About page. */
export function FactsGrid({ content }: { content: SiteContentRow }) {
  const facts = useFacts(content);

  return (
    <dl className="grid grid-cols-2 gap-4">
      {facts.map((fact) => (
        <div
          key={fact.id}
          className="border-bone/10 flex flex-col-reverse justify-end rounded-2xl border bg-white px-5 py-6 sm:px-6 sm:py-7"
        >
          <dt className="text-bone/70 mt-2 text-sm leading-snug font-medium sm:text-base">
            {fact.label}
          </dt>
          <dd
            dir="ltr"
            className="font-display text-bone text-start text-4xl leading-none font-extrabold tracking-tight sm:text-5xl rtl:text-end"
          >
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Directly beneath the opening section: a badge carrying the years figure, a
 * short company introduction across the full width, and the verified figures
 * in a row beneath it. Carries the `about` anchor the header's About entry
 * scrolls to. The full statement, mission and vision live on the About page.
 */
export default function FactsSection({ content }: { content: SiteContentRow }) {
  const t = useTranslations("facts");
  const facts = useFacts(content);
  const years = facts[0];

  return (
    <section id="about" className="scroll-mt-24 bg-white px-4 pt-20 pb-16 sm:px-6 sm:pt-24 lg:px-10">
      <div className="mx-auto max-w-360">
        <Reveal>
          {/* The badge: a shield beside the years figure. */}
          <div className="flex items-center gap-4">
            <svg viewBox="0 0 40 46" className="text-gold h-14 w-auto shrink-0" aria-hidden>
              <path
                d="M20 2 37 8v13c0 11-7.3 19-17 23C10.3 40 3 32 3 21V8L20 2Z"
                fill="currentColor"
                opacity="0.18"
              />
              <path
                d="M20 2 37 8v13c0 11-7.3 19-17 23C10.3 40 3 32 3 21V8L20 2Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <p className="font-display text-bone text-2xl leading-none font-extrabold sm:text-3xl">
                <span dir="ltr">{years.value}</span> {years.label}
              </p>
              <p className="text-gold-deep mt-1.5 text-base font-bold sm:text-lg">
                {t("eyebrow")}
              </p>
            </div>
          </div>

          <h2 className="sr-only">{t("title")}</h2>
          <p className="text-bone/80 mt-8 max-w-5xl text-lg leading-relaxed text-pretty sm:text-xl sm:leading-relaxed">
            {t("intro")}{" "}
            <Link
              href="/about"
              className="text-bone hover:text-gold-deep group inline-flex items-center gap-1.5 font-bold whitespace-nowrap underline decoration-gold decoration-2 underline-offset-4 transition-colors"
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
          </p>
        </Reveal>

        {/* The figures, in a row with hairline dividers. */}
        <Reveal delay={0.1}>
          <dl className="border-bone/12 mt-12 grid grid-cols-2 border-y lg:grid-cols-4">
            {facts.map((fact, i) => (
              <div
                key={fact.id}
                className={
                  "border-bone/12 flex flex-col-reverse justify-end px-2 py-7 sm:px-6 " +
                  (i % 2 === 1 ? "border-s " : "") +
                  (i >= 2 ? "border-t lg:border-t-0 " : "") +
                  (i === 2 ? "lg:border-s " : "")
                }
              >
                <dt className="text-bone/70 mt-2 text-sm font-medium sm:text-base">
                  {fact.label}
                </dt>
                <dd
                  dir="ltr"
                  className="font-display text-bone text-start text-4xl leading-none font-extrabold tracking-tight sm:text-5xl rtl:text-end"
                >
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
