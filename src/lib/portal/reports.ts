import { prisma } from "@/lib/prisma";
import type { ConsoleReport, ReportContent } from "@/lib/report-shape";

/*
 * Deliberately its own query rather than a call to `getRecentReports` in
 * `lib/dashboard-reports.ts`: that helper exists to let the admin console
 * render with no database behind it (see `orPreview`), which is a design-time
 * convenience for an internal tool. The portal is a paying client's real
 * account — inventing a plausible "Morning Jason" out of sample data the
 * moment the database hiccups is a worse failure than an honest empty state,
 * so a portal read that fails is left to fail, and the page shows nothing
 * fabricated in its place.
 */

function toConsoleReport(
  report: Awaited<ReturnType<typeof fetchOne>>,
): ConsoleReport | null {
  if (!report) return null;
  return {
    id: report.id,
    date: report.date.toISOString(),
    kurdistanThreat: report.kurdistanThreat,
    iraqThreat: report.iraqThreat,
    politicalKurdistan: report.politicalKurdistan,
    politicalIraq: report.politicalIraq,
    weather: report.weather,
    executiveSummary: report.executiveSummary,
    content: report.content as unknown as ReportContent,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    createdByName: report.createdBy?.name ?? report.createdBy?.email ?? null,
  };
}

function fetchOne(id: string) {
  return prisma.dailyReport.findUnique({
    where: { id },
    include: { createdBy: { select: { name: true, email: true } } },
  });
}

/** The most recently filed brief — the portal's default "today" view. */
export async function getLatestBrief(): Promise<ConsoleReport | null> {
  const report = await prisma.dailyReport.findFirst({
    orderBy: { date: "desc" },
    include: { createdBy: { select: { name: true, email: true } } },
  });
  return toConsoleReport(report);
}

/** Recent briefs, newest first — Briefing Logs and the Reports table both
 * read from this one list, just render it differently. */
export async function getRecentBriefs(take: number): Promise<ConsoleReport[]> {
  const rows = await prisma.dailyReport.findMany({
    orderBy: { date: "desc" },
    include: { createdBy: { select: { name: true, email: true } } },
    take,
  });
  return rows.map((report) => toConsoleReport(report)!);
}

/** One brief by id, for the Briefing Logs list's inline expansion. */
export async function getBriefById(id: string): Promise<ConsoleReport | null> {
  return toConsoleReport(await fetchOne(id));
}

/**
 * The lead paragraph the Daily Brief opens with.
 *
 * The analyst's own `executiveSummary` when one was written; otherwise a
 * plain, honest fallback assembled from the two figures every report always
 * carries (an item count and the two threat ratings) rather than an empty
 * space where the narrative should be.
 */
export function briefSummary(
  report: ConsoleReport,
  fallback: (count: number) => string,
): string {
  return report.executiveSummary?.trim() || fallback(report.content.items.length);
}

/** First `n` items — the ones a Daily Brief gives full bullets to. */
export function keyIncidents(report: ConsoleReport, n = 3) {
  return report.content.items.slice(0, n);
}

/** Everything past `keyIncidents` — listed lighter, under its own heading. */
export function additionalIncidents(report: ConsoleReport, n = 3) {
  return report.content.items.slice(n);
}
