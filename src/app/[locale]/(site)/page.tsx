import { getTranslations, setRequestLocale } from "next-intl/server";
import HeroCinematic from "@/components/HeroCinematic";
import AboutSection from "@/components/sections/AboutSection";
import IntelligenceSection from "@/components/sections/IntelligenceSection";
import ServicesSection from "@/components/sections/ServicesSection";
import ClientsSection from "@/components/sections/ClientsSection";
import FaqSection from "@/components/sections/FaqSection";
import CareersSection from "@/components/sections/CareersSection";
import ContactSection from "@/components/sections/ContactSection";
import { getSiteContent, pick } from "@/lib/site-content";
import { getPublishedClients } from "@/lib/clients";
import { getPublishedCareerBenefits } from "@/lib/career-benefits";
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

  /*
   * Data for the sections whose components take `useTranslations` and so
   * cannot `await` for themselves. Fetched here, in the one async component
   * that owns the page.
   */
  const logos = await getPublishedClients();
  const benefits = await getPublishedCareerBenefits(l);

  /*
   * The whole site, in the order the menu lists it:
   * Home > About > Intelligence > Services > Clients > FAQ > Careers > Contact.
   *
   * Each section carries the `id` the header's scroll-spy and the drawer's
   * links target, and every one is also reachable at its own route — the
   * section components are shared, so the two can never drift apart.
   */
  return (
    <>
      <HeroCinematic overrides={hero} />
      <AboutSection content={content} />
      <IntelligenceSection />
      <ServicesSection />
      <ClientsSection logos={logos} />
      <FaqSection />
      <CareersSection content={content} benefits={benefits} locale={l} />
      <ContactSection content={content} locale={l} />
    </>
  );
}
