import { getLocale, getTranslations } from "next-intl/server";
import { getPublishedServices } from "@/lib/services";
import { Link } from "@/i18n/navigation";
import Reveal from "@/components/Reveal";
import ServicesSlider from "@/components/ServicesSlider";
import SectionIntro from "@/components/SectionIntro";

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
    <section id="services" className="scroll-mt-24 bg-white px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          as={Heading}
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={t("subtitle")}
        />
      </div>

      {/* The service slider — full-bleed so the row of cards can run edge to edge. */}
      <div className="mt-12">
        <ServicesSlider services={services} />
      </div>

      <div className="mx-auto max-w-7xl">
        <Reveal delay={0.1}>
          <div className="border-bone/12 mt-16 flex flex-col items-start gap-6 border-t pt-12 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-display text-bone max-w-lg text-2xl leading-snug font-bold">
              {t("ctaTitle")}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/contact"
                className="bg-gold text-ink hover:bg-gold-bright inline-flex min-h-12 cursor-pointer items-center rounded-full px-7 text-base font-bold transition-colors"
              >
                {tCta("primary")}
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
