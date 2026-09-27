import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePortalUser } from "@/lib/portal/entitlement";
import { getPortalStats } from "@/lib/portal/stats";
import StatisticsView from "@/components/portal/StatisticsView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "portal.statistics" });
  return { title: t("title") };
}

export default async function PortalStatisticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePortalUser(locale);

  const stats = await getPortalStats();

  return <StatisticsView stats={stats} />;
}
