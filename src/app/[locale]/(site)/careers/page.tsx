import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import CareersSection from "@/components/sections/CareersSection";
import { getSiteContent } from "@/lib/site-content";
import { getPublishedCareerBenefits } from "@/lib/career-benefits";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "careers" });
  return { title: t("eyebrow"), description: t("benefits.environment.body") };
}

export default async function CareersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const content = await getSiteContent();
  const benefits = await getPublishedCareerBenefits(locale as Locale);

  return (
    <CareersSection
      as="h1"
      content={content}
      benefits={benefits}
      locale={locale as Locale}
    />
  );
}
