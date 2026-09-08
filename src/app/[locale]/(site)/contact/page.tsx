import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ContactSection from "@/components/sections/ContactSection";
import { getSiteContent } from "@/lib/site-content";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return { title: t("title") };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const content = await getSiteContent();
  return <ContactSection as="h1" content={content} locale={locale as Locale} />;
}
