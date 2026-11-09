import { prisma } from "@/lib/prisma";
import { renderReportPdf } from "@/lib/pdf/render-report-pdf";
import { reportEmailFilename } from "@/lib/report-email";
import type { ThreatLevel } from "@/lib/reports";
import { REPORT_WITH_EVENTS, reportContentOf } from "@/lib/report-load";

/**
 * Loads a saved report and renders it as the branded PDF — shared by the
 * console and portal downloads and the email action, so a render failure is
 * handled once rather than once per caller.
 *
 * `withSources` picks between the report's two versions: identical content,
 * with or without each event's source link.
 */
export async function renderSavedReportPdf(
  id: string,
  { withSources }: { withSources: boolean },
): Promise<{ dateLabel: string; filename: string; pdf: Buffer } | null> {
  const report = await prisma.dailyReport.findUnique({
    where: { id },
    include: REPORT_WITH_EVENTS,
  });
  if (!report) return null;

  const content = reportContentOf(report);
  const dateLabel = report.date.toISOString().slice(0, 10);

  const pdf = Buffer.from(
    await renderReportPdf({
      date: report.date,
      kurdistanThreat: report.kurdistanThreat as ThreatLevel,
      iraqThreat: report.iraqThreat as ThreatLevel,
      politicalKurdistan: report.politicalKurdistan,
      politicalIraq: report.politicalIraq,
      weather: report.weather,
      executiveSummary: report.executiveSummary,
      items: content.items,
      governorates: content.governorates ?? [],
      withSources,
    }),
  );

  return { dateLabel, filename: reportEmailFilename(dateLabel, withSources), pdf };
}

/** `?sources=0` asks for the version without source links; anything else gets them. */
export function wantsSources(request: Request): boolean {
  return new URL(request.url).searchParams.get("sources") !== "0";
}
