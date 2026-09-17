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
      // A resolved marker stays reachable at its own report link (see
      // `getPublishedMarkerById`) but drops off the *active* picture — the
      // map is where operators look for what is current, not an archive.
      where: { published: true, resolved: false },
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
       * place that decides it. Dropped on the server for a reader without
       * Pro so it never enters the payload — hiding it in the component
       * instead would mean the restricted report had already been delivered
       * to anyone willing to read a network response.
       *
       * Every marker is Pro-gated on the public map now, regardless of its
       * own `access` value — that field still exists for the console's own
       * use, but no longer excuses a marker from entitlement here.
       */
      ...(entitled ? { headline: row.headline, body: row.body } : {}),
    }));
  } catch (error) {
    console.error("Falling back to static intel markers", error);
    return staticMarkers;
  }
}

/** A single marker's full, shareable report — see `report/[id]/page.tsx`. */
export type MarkerReport = {
  id: string;
  label: string;
  coordinates: [number, number];
  severity: IntelMarker["severity"];
  access: IntelMarker["access"];
  resolved: boolean;
  updatedAt: Date;
  headline?: string | null;
  body?: string | null;
};

/**
 * One marker's report, for its own shareable page.
 *
 * Deliberately narrower than the admin console's view of the same row: the
 * analyst's underlying record (category, method, source grading, and the
 * rest of the incident-detail fields) is never served here either, for the
 * same reason it is withheld from the map's own dialog — see the schema
 * comment on `IntelMarker`. A link to this page carries only what the public
 * map already carries, just for one marker instead of the whole picture.
 *
 * Unlike `getPublishedMarkers`, a resolved marker still resolves here — the
 * link stays good after the incident is closed out, matching "resolved
 * reports remain in history" rather than 404ing the moment they are.
 */
export async function getPublishedMarkerById(
  id: string,
  entitled = false,
): Promise<MarkerReport | null> {
  try {
    const row = await prisma.intelMarker.findFirst({
      where: { id, published: true },
      select: {
        id: true,
        label: true,
        longitude: true,
        latitude: true,
        severity: true,
        access: true,
        resolved: true,
        updatedAt: true,
        headline: true,
        body: true,
      },
    });
    if (!row) return null;

    return {
      id: row.id,
      label: row.label,
      coordinates: [row.longitude, row.latitude],
      severity: row.severity.toLowerCase() as IntelMarker["severity"],
      access: row.access.toLowerCase() as IntelMarker["access"],
      resolved: row.resolved,
      updatedAt: row.updatedAt,
      // Same Pro gate as `getPublishedMarkers` — see the comment there.
      ...(entitled ? { headline: row.headline, body: row.body } : {}),
    };
  } catch (error) {
    console.error("Could not load marker report", error);
    return null;
  }
}
