import { useLocale, useTranslations } from "next-intl";
import Reveal from "@/components/Reveal";
import { getSiteContent, pick } from "@/lib/site-content";
import type { Locale } from "@/i18n/routing";

/** The company statement, as supplied. Split for reading, not rewritten. */
const paragraphs = ["p1", "p2", "p3"] as const;

/**
 * The two standing pillars. Kept as ids rather than prose so all three locales
 * stay in the message catalogues.
 */
const pillars = ["mission", "vision"] as const;

/**
 * The credibility figures, previously a standalone strip beneath the hero and
 * now folded in here so the About story and the numbers backing it read as one
 * statement rather than two disconnected bands.
 *
 * TODO: the figures in the message catalogues are placeholders inherited from
 * that strip — replace them with verified numbers before launch.
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
 * Who the company is, sitting between the service offer and the contact ask.
 *
 * The prose is the company's own statement. It shipped baked into the message
 * catalogues and only split into paragraphs for reading; it now reads through
 * the console's `SiteContent` row first, falling back to that shipped copy
 * when nothing has been saved there yet.
 *
 * `content` is fetched by the caller, not here: mixing an `await` with
 * `useTranslations`/`useLocale` in the same async component crashes React
 * ("Expected a suspended thenable") — those hooks read from context via
 * `use()`, which cannot follow an await in the same function.
 *
 * `as` lets a future standalone /about route promote the heading to an h1,
 * matching how IntelligenceSection is shared.
 */
export default function AboutSection({
  as: Heading = "h2",
  content,
}: {
  as?: "h1" | "h2";
  content: Awaited<ReturnType<typeof getSiteContent>>;
}) {
  const t = useTranslations("about");
  const tProof = useTranslations("proof");
  const locale = useLocale() as Locale;

  const p = (field: string, fallback: string) =>
    pick(content, field, locale, fallback);

  return (
    <section id="about" className="relative scroll-mt-24 px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="text-gold text-3xl font-semibold tracking-[0.1em] uppercase sm:text-4xl lg:text-5xl">
            {p("aboutEyebrow", t("eyebrow"))}
          </p>
          <Heading className="font-display text-bone mt-5 max-w-3xl text-2xl leading-snug font-normal text-balance sm:text-3xl lg:text-4xl">
            {p("aboutTitle", t("title"))}
          </Heading>
        </Reveal>

        {/* The statement itself. */}
        <div className="mt-10 max-w-3xl space-y-6">
          {paragraphs.map((paragraph, i) => (
            <Reveal key={paragraph} delay={0.06 * i}>
              <p className="text-bone/70 text-base leading-relaxed text-pretty">
                {p(
                  `aboutBody${paragraph.slice(1)}`,
                  t(`body.${paragraph}`),
                )}
              </p>
            </Reveal>
          ))}
        </div>

        {/* Mission and vision, given equal weight. */}
        <div className="mt-16 grid gap-10 sm:grid-cols-2 sm:gap-12">
          {pillars.map((pillar, i) => (
            <Reveal key={pillar} delay={0.08 * i}>
              <article className="border-bone/14 h-full border-t pt-8">
                <h3 className="font-display text-gold text-3xl font-medium tracking-wide sm:text-4xl">
                  {p(`${pillar}Title`, t(`pillars.${pillar}.title`))}
                </h3>
                <p className="text-bone/65 mt-4 text-sm leading-relaxed text-pretty">
                  {p(`${pillar}Body`, t(`pillars.${pillar}.body`))}
                </p>
              </article>
            </Reveal>
          ))}
        </div>

        {/* The figures behind the statement. */}
        <Reveal delay={0.1}>
          <div className="border-bone/14 mt-20 grid grid-cols-2 gap-y-10 border-y py-14 lg:grid-cols-4">
            {stats.map((stat) => {
              const field = statFields[stat];
              // The figure itself (`15+`, `24/7`) isn't per-locale — only its
              // label is — so it reads straight off the row without `pick()`.
              const rowValues = content as unknown as Record<
                string,
                string | null
              > | null;
              const value =
                rowValues?.[`${field}Value`] || tProof(`stats.${stat}.value`);

              return (
                <div key={stat} className="px-2 text-center">
                  <p className="font-display text-gold text-3xl leading-none sm:text-4xl">
                    {value}
                  </p>
                  <p className="text-bone/58 mt-3 text-xs tracking-[0.18em] uppercase">
                    {p(`${field}Label`, tProof(`stats.${stat}.label`))}
                  </p>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
