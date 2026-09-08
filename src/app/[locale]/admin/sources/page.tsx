import { getTranslations, setRequestLocale } from "next-intl/server";
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
  const t = await getTranslations({ locale, namespace: "admin.reports" });

  const { data: reports, preview } = await getRecentReports(30);

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-bone text-3xl font-light">
          {t("title")}
        </h1>
        <p className="text-bone/55 mt-2 max-w-2xl text-sm leading-relaxed">
          {t("intro")}
        </p>
      </header>

      <ReportConsole reports={reports} canGenerate={!preview} />
    </>
  );
}
