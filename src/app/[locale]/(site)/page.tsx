import { getTranslations, setRequestLocale } from "next-intl/server";
import HeroCinematic from "@/components/HeroCinematic";
import AboutSection from "@/components/sections/AboutSection";
import IntelligenceSection from "@/components/sections/IntelligenceSection";
import ServicesSection from "@/components/sections/ServicesSection";
import { getSiteContent, pick } from "@/lib/site-content";
import type { Locale } from "@/i18n/routing";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // HeroCinematic is a client component (its scroll/pointer animation needs
  // to be), so its console-editable copy is resolved here and passed down
  // rather than fetched inside it.
  const content = await getSiteContent();
  const l = locale as Locale;
  const t = await getTranslations({ locale, namespace: "hero" });
  const hero = {
    eyebrow: pick(content, "heroEyebrow", l, t("eyebrow")),
    title: pick(content, "heroTitle", l, t("title")),
    subtitle: pick(content, "heroSubtitle", l, t("subtitle")),
  };

  return (
    <>
      <HeroCinematic overrides={hero} />
      <IntelligenceSection />
      <ServicesSection />
      {/* Ordered to match the menu: about (04) follows services (03). */}
      <AboutSection content={content} />
    </>
  );
}
