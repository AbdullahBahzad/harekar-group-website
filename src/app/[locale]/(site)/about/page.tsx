import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AboutSection from "@/components/sections/AboutSection";
import { getSiteContent } from "@/lib/site-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("title") };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const content = await getSiteContent();

  return <AboutSection as="h1" content={content} />;
}
