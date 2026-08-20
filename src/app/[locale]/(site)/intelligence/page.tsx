import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import IntelligenceSection from "@/components/sections/IntelligenceSection";

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

  return <IntelligenceSection as="h1" />;
}
