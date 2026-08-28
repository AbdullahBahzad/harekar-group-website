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
export async function getPublishedMarkers(
  /**
   * Whether this reader has Pro. Resolved by the caller on the server with
   * `hasProAccess`, never from anything the browser said about itself.
   */
  entitled = false,
): Promise<IntelMarker[]> {
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
        headline: true,
        body: true,
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
      /*
       * The assessment is attached here or not at all, and this is the only
       * place that decides it.
       *
       * A LOCKED marker's text is dropped on the server for a reader without
       * Pro, so it never enters the payload — hiding it in the component
       * instead would mean the restricted report had already been delivered to
       * anyone willing to read a network response. OPEN markers are readable by
       * everyone, which is what `access` means.
       */
      ...(entitled || row.access === "OPEN"
        ? { headline: row.headline, body: row.body }
        : {}),
    }));
  } catch (error) {
    console.error("Falling back to static intel markers", error);
    return staticMarkers;
  }
}
