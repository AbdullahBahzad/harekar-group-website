import { prisma } from "@/lib/prisma";
import { orPreview, sampleReports } from "@/lib/admin-preview";
import type { ConsoleReport, ReportContent } from "@/lib/report-shape";

/**
 * Recent Daily Security Reports, for the Sources station's own list and for
 * the dashboard's summary panel — both want the same rows in the same shape,
 * just a different number of them.
 *
 * Dates become strings here because a Date cannot cross into a client
 * component, and `content` is cast rather than validated — it was written by
 * `saveReport` in this same shape, so a schema check on the way back out
 * would only duplicate what the write side already guarantees.
 */
export async function getRecentReports(take: number) {
  return orPreview<ConsoleReport[]>(
    async () => {
      const rows = await prisma.dailyReport.findMany({
        orderBy: { date: "desc" },
        include: { createdBy: { select: { name: true, email: true } } },
        take,
      });

      return rows.map((report) => ({
        id: report.id,
        date: report.date.toISOString(),
        kurdistanThreat: report.kurdistanThreat,
        iraqThreat: report.iraqThreat,
        politicalKurdistan: report.politicalKurdistan,
        politicalIraq: report.politicalIraq,
        weather: report.weather,
        content: report.content as unknown as ReportContent,
        createdAt: report.createdAt.toISOString(),
        createdByName: report.createdBy?.name ?? report.createdBy?.email ?? null,
      }));
    },
    sampleReports.slice(0, take).map((report) => ({
      id: report.id,
      date: report.date.toISOString(),
      kurdistanThreat: report.kurdistanThreat,
      iraqThreat: report.iraqThreat,
      politicalKurdistan: report.politicalKurdistan,
      politicalIraq: report.politicalIraq,
      weather: report.weather,
      content: report.content,
      createdAt: report.createdAt.toISOString(),
      createdByName: report.createdBy?.name ?? null,
    })),
  );
}
