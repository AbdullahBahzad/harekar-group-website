import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePortalUser } from "@/lib/portal/entitlement";
import { getIncidentFeed } from "@/lib/portal/incidents";
import IncidentFeed from "@/components/portal/IncidentFeed";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "portal.incidents" });
  return { title: t("title") };
}

export default async function PortalIncidentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePortalUser(locale);

  const incidents = await getIncidentFeed();

  return <IncidentFeed incidents={incidents} />;
}
