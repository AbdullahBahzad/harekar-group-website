import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePortalUser } from "@/lib/portal/entitlement";
import { getConsoleData } from "@/lib/portal/console";
import ConsoleView from "@/components/portal/ConsoleView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "portal.console" });
  return { title: t("title") };
}

/**
 * The live operational picture: every published incident on the Iraq map,
 * narrowed by date range and by "tactical areas" — governorates switched on
 * from a panel over the map, each shaded on the map and filtering the count
 * and the feed to incidents inside it.
 *
 * The admin console shows the same view at /admin/console.
 */
export default async function PortalConsolePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePortalUser(locale, "/portal/console");
  const t = await getTranslations({ locale, namespace: "portal.console" });
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
