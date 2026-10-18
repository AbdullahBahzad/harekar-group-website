import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePortalUser } from "@/lib/portal/entitlement";
import { getIncidentFeed, type PortalIncident } from "@/lib/portal/incidents";
import { logReadFallback } from "@/lib/prisma";
import { governorateShapes } from "@/data/iraq-governorates";
import ConsoleView, { type ConsoleArea } from "@/components/portal/ConsoleView";

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
 * The incidents, and the moment they were read — taken together, so the
 * date filter measures "last 30 days" from the same instant on the server
 * render and on hydration.
 */
async function loadConsole(): Promise<{ incidents: PortalIncident[]; now: number }> {
  try {
    return { incidents: await getIncidentFeed(500), now: Date.now() };
  } catch (error) {
    logReadFallback("no incidents on the console", error);
    return { incidents: [], now: Date.now() };
  }
}

/**
 * The live operational picture: every published incident on the Iraq map,
 * narrowed by date range and by "tactical areas" — governorates switched on
 * from a panel over the map, each shaded on the map and filtering the count
 * and the feed to incidents inside it.
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
  // The governorate names already translated for the report matrix.
  const tGovernorate = await getTranslations({
    locale,
    namespace: "admin.reports.governorateNames",
  });

  const { incidents, now } = await loadConsole();

  const areas: ConsoleArea[] = governorateShapes
    .map((shape) => ({ key: shape.key, name: tGovernorate(shape.key), rings: shape.rings }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));

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
