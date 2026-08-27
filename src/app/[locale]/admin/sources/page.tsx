import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import ReportConsole from "@/components/admin/ReportConsole";
import { getRecentReports } from "@/lib/dashboard-reports";

export default async function SourcesStation({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);

  const { data: reports, preview } = await getRecentReports(30);

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-bone text-3xl font-light">
          Sources
        </h1>
        <p className="text-bone/45 mt-2 max-w-2xl text-sm leading-relaxed">
          Curate the day&apos;s sources, set the threat and political
          assessment, and let Claude draft the write-up for review. Nothing
          is saved until you approve it below — the approved write-ups
          themselves also appear on the Dashboard.
        </p>
      </header>

      <ReportConsole reports={reports} canGenerate={!preview} />
    </>
  );
}
