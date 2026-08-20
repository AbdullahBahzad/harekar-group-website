import { prisma } from "@/lib/prisma";
import {
  intelMarkers as staticMarkers,
  type IntelMarker,
} from "@/data/iraq";

/**
 * The published operational picture, for the public map.
 *
 * Falls back to the original hardcoded markers when the table is empty or the
 * database is unreachable. That fallback is deliberate and worth keeping: the
 * intelligence map is the centrepiece of the home page, and a database blip
 * should degrade it to last-known-good rather than blanking the country.
 *
 * Draft markers are filtered in the query, not after it — an unpublished
 * assessment must never travel to the browser, even inside a payload that
 * would not render it.
 */
export async function getPublishedMarkers(): Promise<IntelMarker[]> {
  try {
    const rows = await prisma.intelMarker.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      select: {
        id: true,
        label: true,
        longitude: true,
        latitude: true,
        severity: true,
        access: true,
      },
    });

    if (rows.length === 0) return staticMarkers;

    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      coordinates: [row.longitude, row.latitude],
      // The database speaks in enums; the map's props predate them.
      severity: row.severity.toLowerCase() as IntelMarker["severity"],
      access: row.access.toLowerCase() as IntelMarker["access"],
    }));
  } catch (error) {
    console.error("Falling back to static intel markers", error);
    return staticMarkers;
  }
}
