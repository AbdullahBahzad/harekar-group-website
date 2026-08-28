import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import IntelligenceSection from "@/components/sections/IntelligenceSection";
import DailyReportsSection from "@/components/sections/DailyReportsSection";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "intelligence" });
  return { title: t("title") };
}

export default async function IntelligencePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  /*
   * The bulletins sit on this route only, not inside `IntelligenceSection` —
   * that component is shared with the home one-pager, and the marketing page
   * should stay a map rather than becoming a reading list.
   */
  return (
    <>
      <IntelligenceSection as="h1" />
      <DailyReportsSection />
    </>
  );
}
