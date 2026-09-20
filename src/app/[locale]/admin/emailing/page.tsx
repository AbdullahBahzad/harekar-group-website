import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireReportsAccess } from "@/lib/admin";
import EmailingConsole from "@/components/admin/EmailingConsole";
import { getRecentReports } from "@/lib/dashboard-reports";
import { getReportRecipients } from "@/lib/report-recipients";

/**
 * Client Emailing — the saved client list and the one-click send.
 *
 * Gated like the Sources station rather than like the other stations: it mails
 * that station's reports, so anyone allowed to publish one is allowed to send
 * it. See `lib/admin.ts`.
 */
export default async function EmailingStation({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireReportsAccess(locale);
  const t = await getTranslations({ locale, namespace: "admin.emailing" });

  const { data: recipients } = await getReportRecipients();
  const { data: reports } = await getRecentReports(30);

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

      <EmailingConsole
        recipients={recipients}
        // Only what the picker and preview need — the full report body is
        // never read here, and would only inflate the page payload.
        templates={reports.map((report) => ({
          id: report.id,
          date: report.date,
        }))}
      />
    </>
  );
}
