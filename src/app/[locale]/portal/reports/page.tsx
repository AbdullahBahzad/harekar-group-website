import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePortalUser } from "@/lib/portal/entitlement";
import { getLatestBrief, getRecentBriefs } from "@/lib/portal/reports";
import { getPublishedMarkers } from "@/lib/intel";
import IraqMap from "@/components/IraqMap";
import ReportsStation from "@/components/portal/ReportsStation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "portal.reports" });
  return { title: t("title") };
}

const BRIEFING_LOG_DEPTH = 30;

export default async function PortalReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePortalUser(locale);

  const [latestBrief, recentBriefs, markers] = await Promise.all([
    getLatestBrief(),
    getRecentBriefs(BRIEFING_LOG_DEPTH),
    // Always the entitled read: every visitor who reaches the portal has
    // already been proven to have Pro, in `requirePortalUser` above.
    getPublishedMarkers(true),
  ]);

  return (
    <ReportsStation
      name={user.name ?? user.email}
      latestBrief={latestBrief}
      recentBriefs={recentBriefs}
      map={<IraqMap markers={markers} />}
    />
  );
}
