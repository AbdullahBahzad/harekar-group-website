import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import Reveal from "@/components/Reveal";
import { GradientCard } from "@/components/ui/gradient-card";
import { getSiteContent, pick } from "@/lib/site-content";
import type { Locale } from "@/i18n/routing";

/**
 * The two standing pillars. Kept as ids rather than prose so all three locales
 * stay in the message catalogues.
 */
const pillars = ["mission", "vision"] as const;

/** Line icons, drawn to match the admin console's set (20px grid, 1.5 stroke). */
const iconProps = {
  viewBox: "0 0 20 20",
  fill: "none",
  strokeWidth: 1.5,
  className: "size-5",
  "aria-hidden": true,
} as const;

const pillarIcons: Record<(typeof pillars)[number], ReactNode> = {
  mission: (
    <svg {...iconProps}>
      <circle cx="10" cy="10" r="7" stroke="currentColor" />
      <circle cx="10" cy="10" r="3.5" stroke="currentColor" />
      <circle cx="10" cy="10" r="0.6" stroke="currentColor" />
    </svg>
  ),
  vision: (
    <svg {...iconProps}>
      <path
        d="M1.75 10S5 4.5 10 4.5 18.25 10 18.25 10 15 15.5 10 15.5 1.75 10 1.75 10Z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" />
    </svg>
  ),
};

/**
 * The statement's second and third paragraphs sit in cards beside the lead
 * paragraph. Each carries the icon for what it is about — protection, then
 * civil works — so the copy stays the company's own; only the presentation
 * changed.
 */
const supporting = [
  {
    paragraph: "p2",
    icon: (
      <svg {...iconProps}>
        <path
          d="M10 2.5 16.5 5v4.6c0 4.1-2.7 6.9-6.5 7.9-3.8-1-6.5-3.8-6.5-7.9V5L10 2.5Z"
          stroke="currentColor"
          strokeLinejoin="round"
        />
        <path
          d="M7.4 10 9 11.6l3.6-3.6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    paragraph: "p3",
    icon: (
      <svg {...iconProps}>
        <path
          d="M3.5 17.25V4.75a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v12.5"
          stroke="currentColor"
          strokeLinejoin="round"
        />
        <path
          d="M11.5 8.25h4a1 1 0 0 1 1 1v8h-5"
          stroke="currentColor"
          strokeLinejoin="round"
        />
        <path
          d="M6 6.75h2.5M6 9.75h2.5M6 12.75h2.5"
          stroke="currentColor"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
] as const;

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
    <section
      id="about"
      className="relative scroll-mt-24 overflow-hidden px-6 py-28"
    >
      {/* Ambient light — gives the dark ground some depth without an image. */}
      <div
        aria-hidden
        className="bg-gold/[0.07] pointer-events-none absolute -top-40 -end-40 size-[40rem] rounded-full blur-[120px]"
      />
      <div
        aria-hidden
        className="bg-gold/[0.04] pointer-events-none absolute -bottom-40 -start-40 size-[32rem] rounded-full blur-[120px]"
      />

      <div className="relative mx-auto max-w-6xl">
        <Reveal>
          <p className="text-gold text-3xl font-semibold tracking-[0.1em] uppercase sm:text-4xl lg:text-5xl">
            {p("aboutEyebrow", t("eyebrow"))}
          </p>
          <Heading className="font-display text-bone mt-5 max-w-3xl text-2xl leading-snug font-normal text-balance sm:text-3xl lg:text-4xl">
            {p("aboutTitle", t("title"))}
          </Heading>
          <div
            aria-hidden
            className="from-gold mt-8 h-px w-28 bg-gradient-to-r to-transparent rtl:bg-gradient-to-l"
          />
        </Reveal>

        {/*
         * The statement. The first paragraph is the lead and gets the room;
         * the other two are set beside it as cards, so the page is not one
         * long column of prose with an empty half.
         */}
        <div className="mt-14 grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
          <Reveal className="lg:col-span-7">
            <p className="text-bone/85 border-gold/60 border-s-2 ps-6 text-lg leading-relaxed text-pretty sm:text-xl sm:leading-relaxed">
              {p("aboutBody1", t("body.p1"))}
            </p>
          </Reveal>

          <div className="space-y-5 lg:col-span-5">
            {supporting.map(({ paragraph, icon }, i) => (
              <Reveal key={paragraph} delay={0.08 * (i + 1)}>
                <article className="border-bone/12 bg-surface/20 hover:border-gold/40 flex gap-4 rounded-2xl border p-5 backdrop-blur-sm transition-colors duration-300">
                  <span className="border-gold/30 bg-gold/10 text-gold flex size-11 shrink-0 items-center justify-center rounded-full border">
                    {icon}
                  </span>
                  <p className="text-bone/70 text-sm leading-relaxed text-pretty">
                    {p(
                      `aboutBody${paragraph.slice(1)}`,
                      t(`body.${paragraph}`),
                    )}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Mission and vision, given equal weight. */}
        <div className="mt-20 grid gap-6 sm:grid-cols-2">
          {pillars.map((pillar, i) => (
            <Reveal key={pillar} delay={0.08 * i} className="h-full">
              <GradientCard
                as="h3"
                index={String(i + 1).padStart(2, "0")}
                icon={pillarIcons[pillar]}
                title={p(`${pillar}Title`, t(`pillars.${pillar}.title`))}
                body={p(`${pillar}Body`, t(`pillars.${pillar}.body`))}
              />
            </Reveal>
          ))}
        </div>

        {/* The figures behind the statement. */}
        <Reveal delay={0.1}>
          <div className="mt-20 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
                <div
                  key={stat}
                  className="border-bone/12 bg-surface/20 hover:border-gold/40 relative overflow-hidden rounded-2xl border px-4 py-9 text-center transition-colors duration-300"
                >
                  <span
                    aria-hidden
                    className="via-gold/70 absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
                  />
                  <p className="font-display from-gold-bright to-gold bg-gradient-to-b bg-clip-text text-4xl leading-none text-transparent sm:text-5xl">
                    {value}
                  </p>
                  <p className="text-bone/60 mt-4 text-xs tracking-[0.18em] uppercase">
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
