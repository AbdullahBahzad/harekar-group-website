import { IRAQ_BOUNDS } from "@/data/iraq";
import { governorateShapes } from "@/data/iraq-governorates";
import type { GovernorateKey, ReportNewsItem } from "@/lib/report-shape";

/**
 * Where a report event goes on an event map.
 *
 * Safe to import from client components: plain data and arithmetic only.
 */

/** Whether a coordinate is plausibly inside Iraq (its bounding box). */
export function inIraq(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= IRAQ_BOUNDS.minLat &&
    lat <= IRAQ_BOUNDS.maxLat &&
    lng >= IRAQ_BOUNDS.minLon &&
    lng <= IRAQ_BOUNDS.maxLon
  );
}

/** Mean of a ring's vertices: good enough to place a pin inside a governorate. */
function ringCentre(ring: [number, number][]): [number, number] {
  let lng = 0;
  let lat = 0;
  for (const [x, y] of ring) {
    lng += x;
    lat += y;
  }
  return [lng / ring.length, lat / ring.length];
}

/**
 * A representative point per governorate, from its largest outline.
 *
 * Halabja has no outline of its own (the boundary data predates it — see
 * `iraq-governorates.ts`), so it gets its town centre.
 */
const GOVERNORATE_CENTRES: Partial<Record<GovernorateKey, [number, number]>> = {
  ...Object.fromEntries(
    governorateShapes.map((shape) => {
      const largest = shape.rings.reduce((a, b) => (b.length > a.length ? b : a));
      return [shape.key, ringCentre(largest)];
    }),
  ),
  HALABJA: [45.986, 35.178],
};

export type EventPin = {
  lat: number;
  lng: number;
  /** True when placed at the governorate's centre rather than an exact pin. */
  approximate: boolean;
};

/**
 * Where to draw an event: its exact pin when it has one, otherwise the centre
 * of its governorate, otherwise nowhere (it is listed but not mapped).
 */
export function eventPin(item: ReportNewsItem): EventPin | null {
  if (
    typeof item.latitude === "number" &&
    typeof item.longitude === "number" &&
    inIraq(item.latitude, item.longitude)
  ) {
    return { lat: item.latitude, lng: item.longitude, approximate: false };
  }
  const centre = item.governorate ? GOVERNORATE_CENTRES[item.governorate] : undefined;
  if (centre) return { lng: centre[0], lat: centre[1], approximate: true };
  return null;
}
