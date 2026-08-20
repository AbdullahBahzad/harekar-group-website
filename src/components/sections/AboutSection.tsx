import { useTranslations } from "next-intl";
import Reveal from "@/components/Reveal";

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

/**
 * Who the company is, sitting between the service offer and the contact ask.
 *
 * The prose is the company's own statement, carried verbatim into the message
 * catalogues and only split into paragraphs for reading. Nothing here is
 * paraphrased or embellished — the claims are theirs to make.
 *
 * `as` lets a future standalone /about route promote the heading to an h1,
 * matching how IntelligenceSection is shared.
 */
export default function AboutSection({
  as: Heading = "h2",
}: {
  as?: "h1" | "h2";
}) {
  const t = useTranslations("about");
  const tProof = useTranslations("proof");

  return (
    <section id="about" className="relative scroll-mt-24 px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="text-gold/80 text-xs tracking-[0.35em] uppercase">
            {t("eyebrow")}
          </p>
          <Heading className="font-display text-bone mt-6 max-w-3xl text-4xl leading-[1.15] font-light text-balance sm:text-5xl lg:text-6xl">
            {t("title")}
          </Heading>
        </Reveal>

        {/* The statement itself. */}
        <div className="mt-10 max-w-3xl space-y-6">
          {paragraphs.map((paragraph, i) => (
            <Reveal key={paragraph} delay={0.06 * i}>
              <p className="text-bone/60 text-base leading-relaxed text-pretty">
                {t(`body.${paragraph}`)}
              </p>
            </Reveal>
          ))}
        </div>

        {/* Mission and vision, given equal weight. */}
        <div className="mt-16 grid gap-10 sm:grid-cols-2 sm:gap-12">
          {pillars.map((pillar, i) => (
            <Reveal key={pillar} delay={0.08 * i}>
              <article className="border-bone/10 h-full border-t pt-8">
                <h3 className="font-display text-gold text-xl tracking-wide">
                  {t(`pillars.${pillar}.title`)}
                </h3>
                <p className="text-bone/55 mt-4 text-sm leading-relaxed text-pretty">
                  {t(`pillars.${pillar}.body`)}
                </p>
              </article>
            </Reveal>
          ))}
        </div>

        {/* The figures behind the statement. */}
        <Reveal delay={0.1}>
          <div className="border-bone/10 mt-20 grid grid-cols-2 gap-y-10 border-y py-14 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat} className="px-2 text-center">
                <p className="font-display text-gold text-3xl leading-none sm:text-4xl">
                  {tProof(`stats.${stat}.value`)}
                </p>
                <p className="text-bone/50 mt-3 text-xs tracking-[0.18em] uppercase">
                  {tProof(`stats.${stat}.label`)}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
