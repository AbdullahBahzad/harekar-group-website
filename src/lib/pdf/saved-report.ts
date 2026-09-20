import { prisma } from "@/lib/prisma";
import { renderReportPdf } from "@/lib/pdf/render-report-pdf";
import type { ReportContent, ThreatLevel } from "@/lib/reports";

/**
 * Loads a saved report and renders it as the same branded PDF the console's
 * "Download PDF" link produces — shared by every path that emails a report,
 * so a render failure is handled once rather than once per caller.
 */
export async function renderSavedReportPdf(
  id: string,
): Promise<{ dateLabel: string; pdf: Buffer } | null> {
  const report = await prisma.dailyReport.findUnique({ where: { id } });
  if (!report) return null;

  const content = report.content as unknown as ReportContent;
  const dateLabel = report.date.toISOString().slice(0, 10);

  const pdf = Buffer.from(
    await renderReportPdf({
      date: report.date,
      kurdistanThreat: report.kurdistanThreat as ThreatLevel,
      iraqThreat: report.iraqThreat as ThreatLevel,
      politicalKurdistan: report.politicalKurdistan,
      politicalIraq: report.politicalIraq,
      weather: report.weather,
      items: content.items,
      governorates: content.governorates ?? [],
    }),
  );

  return { dateLabel, pdf };
}
