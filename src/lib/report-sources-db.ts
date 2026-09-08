import { prisma } from "@/lib/prisma";
import { REPORT_SOURCES } from "@/data/report-sources";
import type { Region } from "@/lib/report-shape";

/**
 * A source the checklist can fetch from — one of the eleven built into the
 * app, or one an operator added via the console. `id` is `null` for a
 * built-in source: there is nothing to delete, since it lives in code, not
 * the database.
 */
export type CombinedSource = {
  id: string | null;
  name: string;
  url: string;
  defaultRegion: Region;
  custom: boolean;
};

/**
 * The fixed eleven plus whatever an operator has added, in one list —
 * everywhere a source is fetched from or shown in the console reads this
 * rather than `REPORT_SOURCES` directly, so a custom source behaves exactly
 * like a built-in one from here on.
 */
export async function listCombinedSources(): Promise<CombinedSource[]> {
  const custom = await prisma.reportSource.findMany({
    orderBy: { createdAt: "asc" },
  });

  const builtIn: CombinedSource[] = REPORT_SOURCES.map((source) => ({
    id: null,
    name: source.name,
    url: source.url,
    defaultRegion: source.defaultRegion,
    custom: false,
  }));

  return [
    ...builtIn,
    ...custom.map((source) => ({
      id: source.id,
      name: source.name,
      url: source.url,
      defaultRegion: source.defaultRegion as Region,
      custom: true,
    })),
  ];
}
