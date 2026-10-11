import { getTranslations, setRequestLocale } from "next-intl/server";
import HeroVideo from "@/components/HeroVideo";
import FactsSection from "@/components/sections/FactsSection";
import CapabilitiesSection from "@/components/sections/CapabilitiesSection";
import WhySection from "@/components/sections/WhySection";
import ClientsSection from "@/components/sections/ClientsSection";
import CoverageSection from "@/components/sections/CoverageSection";
import IntelligenceFeature from "@/components/sections/IntelligenceFeature";
import ContactSection from "@/components/sections/ContactSection";
import { getSiteContent, pick } from "@/lib/site-content";
import { getPublishedClients } from "@/lib/clients";
import { auth } from "@/auth";
import { getPublishedMarkers } from "@/lib/intel";
import IraqMap from "@/components/IraqMap";
import MapStage from "@/components/MapStage";
import type { Locale } from "@/i18n/routing";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // HeroVideo is a client component (it drives the banner video), so its
  // console-editable copy is resolved here and passed down rather than
  // fetched inside it.
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

  /*
   * The intelligence map's markers. Entitlement is resolved here, on the
   * server, and decides what is put in the payload at all — the same gate
   * `IntelligenceSection` applies on the /intelligence page.
   */
  const session = await auth();
  const markers = await getPublishedMarkers(Boolean(session?.user?.isPro));

  /*
   * The home page, in the order the client specified — opening section,
   * verified company facts, main services, why choose Harekar, selected
   * experience and clients, coverage, contact — with the intelligence product
   * featured just before the contact ask.
   *
   * The full company statement, mission and vision live on /about, the job
   * application form on /careers, and the FAQ and intelligence map on their
   * own pages — linked from the header's About menu and the footer.
   */
  return (
    <>
      <HeroVideo overrides={hero} />
      <FactsSection content={content} />
      <CapabilitiesSection />
      <WhySection />
      <ClientsSection logos={logos} showAllLink />
      <CoverageSection />
      <IntelligenceFeature>
        <MapStage>
          <IraqMap markers={markers} />
        </MapStage>
      </IntelligenceFeature>
      <ContactSection content={content} locale={l} showMap={false} />
    </>
  );
}
