import { getTranslations } from "next-intl/server";
import { getIncidentFeed, type PortalIncident } from "@/lib/portal/incidents";
import { logReadFallback } from "@/lib/prisma";
import { governorateShapes } from "@/data/iraq-governorates";
import type { ConsoleArea } from "@/components/portal/ConsoleView";

/**
 * Everything the Console view needs, shared by the client portal's Console
 * and the admin console's copy of it, so the two always show the same
 * picture: the published incidents, the moment they were read (so "last 30
 * days" is measured from the same instant on the server and on hydration),
 * and the governorates as tactical areas, named in the reader's language
 * and sorted by that name.
 */
export async function getConsoleData(locale: string): Promise<{
  incidents: PortalIncident[];
  now: number;
  areas: ConsoleArea[];
}> {
  // The governorate names already translated for the report matrix.
  const tGovernorate = await getTranslations({
    locale,
    namespace: "admin.reports.governorateNames",
  });
  const areas: ConsoleArea[] = governorateShapes
    .map((shape) => ({ key: shape.key, name: tGovernorate(shape.key), rings: shape.rings }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  try {
    return { incidents: await getIncidentFeed(500), now: Date.now(), areas };
  } catch (error) {
    logReadFallback("no incidents on the console", error);
    return { incidents: [], now: Date.now(), areas };
  }
}
