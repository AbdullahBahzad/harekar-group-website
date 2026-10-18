import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import { getConsoleData } from "@/lib/portal/console";
import ConsoleView from "@/components/portal/ConsoleView";

/**
 * The client portal's Console, inside the admin console — the same map,
 * date range, tactical areas and feed, over the same published incidents,
 * so an operator sees exactly what clients see.
 */
export default async function AdminConsoleStation({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations({ locale, namespace: "admin.console" });
  const { incidents, now, areas } = await getConsoleData(locale);

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-bone text-3xl font-light">{t("title")}</h1>
        <p className="text-bone/55 mt-2 max-w-2xl text-sm leading-relaxed">{t("intro")}</p>
      </header>

      <ConsoleView incidents={incidents} areas={areas} now={now} />
    </>
  );
}
