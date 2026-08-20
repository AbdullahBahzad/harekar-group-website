import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import ReportConsole, {
  type ConsoleReport,
} from "@/components/admin/ReportConsole";
import { orPreview, sampleReports } from "@/lib/admin-preview";
import type { ReportContent } from "@/lib/reports";

export default async function ReportsStation({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);

  /*
   * Dates become strings here because a Date cannot cross into a client
   * component, and `content` is cast rather than validated — it was written
   * by `saveReport` in this same shape, so a schema check on the way back out
   * would only duplicate what the write side already guarantees.
   */
  const { data: reports, preview } = await orPreview<ConsoleReport[]>(
    async () => {
      const rows = await prisma.dailyReport.findMany({
        orderBy: { date: "desc" },
        include: { createdBy: { select: { name: true, email: true } } },
        take: 30,
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
    sampleReports.map((report) => ({
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

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-bone text-3xl font-light">
          Reports
        </h1>
        <p className="text-bone/45 mt-2 max-w-2xl text-sm leading-relaxed">
          Curate the day&apos;s sources, set the threat and political
          assessment, and let Claude draft the write-up for review. Nothing
          is saved until you approve it below.
        </p>
      </header>

      <ReportConsole reports={reports} canGenerate={!preview} />
    </>
  );
}
