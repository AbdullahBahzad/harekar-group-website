import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ClientsSection from "@/components/sections/ClientsSection";
import { getPublishedClients } from "@/lib/clients";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "clients" });
  return { title: t("eyebrow"), description: t("subtitle") };
}

export default async function ClientsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const logos = await getPublishedClients();
  return <ClientsSection as="h1" logos={logos} />;
}
