import { setRequestLocale } from "next-intl/server";
import HeroCinematic from "@/components/HeroCinematic";
import AboutSection from "@/components/sections/AboutSection";
import IntelligenceSection from "@/components/sections/IntelligenceSection";
import ServicesSection from "@/components/sections/ServicesSection";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <HeroCinematic />
      <IntelligenceSection />
      <ServicesSection />
      {/* Ordered to match the menu: about (04) follows services (03). */}
      <AboutSection />
    </>
  );
}
