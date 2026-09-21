import { getLocale, getTranslations } from "next-intl/server";
import { getPublishedServices } from "@/lib/services";
import { Link } from "@/i18n/navigation";
import Reveal from "@/components/Reveal";
import ServicesGrid from "@/components/ServicesGrid";

/**
 * Shared by the one-page scroll and the standalone /services route.
 * `as` lets the standalone page promote the heading to an h1.
 */
export default async function ServicesSection({
  as: Heading = "h2",
}: {
  as?: "h1" | "h2";
}) {
  const t = await getTranslations("services");
  const tCta = await getTranslations("cta");
  const locale = await getLocale();
  const services = await getPublishedServices(locale);

  return (
    <section
      id="services"
      className="relative scroll-mt-24 overflow-hidden px-6 py-28"
    >
      {/* Ambient light, as in the About section — depth without an image. */}
      <div
        aria-hidden
        className="bg-gold/[0.06] pointer-events-none absolute -top-40 -start-40 size-[36rem] rounded-full blur-[120px]"
      />
      <div
        aria-hidden
        className="bg-gold/[0.04] pointer-events-none absolute -end-40 top-1/2 size-[34rem] rounded-full blur-[120px]"
      />

      <div className="relative mx-auto max-w-7xl">
        <Reveal>
          <p className="text-gold text-3xl font-semibold tracking-[0.1em] uppercase sm:text-4xl lg:text-5xl">
            {t("eyebrow")}
          </p>
          <Heading className="font-display text-bone mt-5 max-w-3xl text-2xl leading-snug font-normal text-balance sm:text-3xl lg:text-4xl">
            {t("title")}
          </Heading>
          <p className="text-bone/70 mt-6 max-w-2xl text-base leading-relaxed text-pretty">
            {t("subtitle")}
          </p>
          <div
            aria-hidden
            className="from-gold mt-8 h-px w-28 bg-gradient-to-r to-transparent rtl:bg-gradient-to-l"
          />
        </Reveal>

        <div className="mt-14">
          <ServicesGrid services={services} />
        </div>

        <Reveal delay={0.1}>
          <div className="border-bone/14 mt-20 flex flex-col items-start gap-6 border-t pt-12 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-display text-bone max-w-lg text-2xl leading-snug font-light">
              {t("ctaTitle")}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/contact"
                className="bg-gold text-ink hover:bg-gold-bright cursor-pointer rounded-full px-7 py-3 text-sm font-medium transition-colors"
              >
                {tCta("primary")}
              </Link>
              <Link
                href="/contact"
                className="border-bone/25 text-bone/85 hover:border-gold hover:text-gold cursor-pointer rounded-full border px-7 py-3 text-sm transition-colors"
              >
                {tCta("secondary")}
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
