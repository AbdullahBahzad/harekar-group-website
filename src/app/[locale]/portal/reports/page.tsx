import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePortalUser } from "@/lib/portal/entitlement";
import { getEventsEnding, getLatestBrief, getRecentBriefs } from "@/lib/portal/reports";
import ReportsStation from "@/components/portal/ReportsStation";

/** How far back the Daily Brief's trend chart looks: this week and last. */
const TREND_DAYS = 14;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "portal.reports" });
  return { title: t("title") };
}

/** How many reports the Briefing Logs and Reports archive load — a year. */
const BRIEFING_LOG_DEPTH = 365;

export default async function PortalReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePortalUser(locale);

  const [latestBrief, recentBriefs] = await Promise.all([
    getLatestBrief(),
    getRecentBriefs(BRIEFING_LOG_DEPTH),
  ]);
  // The two weeks ending on the latest brief's day — not "today", so a brief
  // filed yesterday still shows a full this-week/last-week comparison.
  const trendEvents = latestBrief
    ? await getEventsEnding(new Date(latestBrief.date), TREND_DAYS)
    : [];

  return (
    <ReportsStation
      name={user.name ?? user.email}
      latestBrief={latestBrief}
      recentBriefs={recentBriefs}
      trendEvents={trendEvents}
    />
  );
}
