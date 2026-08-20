import { useTranslations } from "next-intl";

/**
 * Credibility band directly beneath the hero.
 *
 * Every landing pattern for high-trust B2B ranks proof immediately after the
 * hero, so this sits above the fold-break rather than deep in the page.
 *
 * TODO: the figures in the message catalogues are placeholders — replace them
 * with verified numbers before launch.
 */
const stats = ["experience", "personnel", "sites", "coverage"] as const;

export default function ProofStrip() {
  const t = useTranslations("proof");

  return (
    <section id="about" className="border-bone/10 scroll-mt-24 border-y">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-10 px-6 py-14 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat} className="px-2 text-center">
            <p className="font-display text-gold text-3xl leading-none sm:text-4xl">
              {t(`stats.${stat}.value`)}
            </p>
            <p className="text-bone/50 mt-3 text-xs tracking-[0.18em] uppercase">
              {t(`stats.${stat}.label`)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
