import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import Reveal from "@/components/Reveal";
import SectionIntro from "@/components/SectionIntro";
import InfoCard from "@/components/InfoCard";
import { FactsGrid } from "@/components/sections/FactsSection";
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
 * Who the company is — the About page.
 *
 * The home page carries only a short introduction (FactsSection); the full
 * statement, the mission and the vision live here, as the client asked.
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
  const locale = useLocale() as Locale;

  const p = (field: string, fallback: string) =>
    pick(content, field, locale, fallback);

  return (
    <section id="about" className="scroll-mt-24 bg-white px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionIntro
          as={Heading}
          eyebrow={p("aboutEyebrow", t("eyebrow"))}
          title={p("aboutTitle", t("title"))}
        />

        {/*
         * The statement. The first paragraph is the lead and gets the room;
         * the other two are set beside it as cards, so the page is not one
         * long column of prose with an empty half.
         */}
        <div className="mt-12 grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
          <Reveal className="lg:col-span-7">
            <p className="text-bone/85 border-gold border-s-4 ps-6 text-lg leading-relaxed text-pretty sm:text-xl sm:leading-relaxed">
              {p("aboutBody1", t("body.p1"))}
            </p>
          </Reveal>

          <div className="space-y-5 lg:col-span-5">
            {supporting.map(({ paragraph, icon }, i) => (
              <Reveal key={paragraph} delay={0.08 * (i + 1)}>
                <article className="border-bone/10 bg-surface flex gap-4 rounded-2xl border p-5">
                  <span className="border-gold/30 bg-gold/12 text-gold-deep flex size-11 shrink-0 items-center justify-center rounded-full border">
                    {icon}
                  </span>
                  <p className="text-bone/80 text-base leading-relaxed text-pretty">
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
        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {pillars.map((pillar, i) => (
            <Reveal key={pillar} delay={0.08 * i} className="h-full">
              <InfoCard
                icon={pillarIcons[pillar]}
                title={p(`${pillar}Title`, t(`pillars.${pillar}.title`))}
                body={p(`${pillar}Body`, t(`pillars.${pillar}.body`))}
              />
            </Reveal>
          ))}
        </div>

        {/* The figures behind the statement. */}
        <Reveal delay={0.1} className="mt-16">
          <div className="bg-surface rounded-3xl p-4 sm:p-6">
            <FactsGrid content={content} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
