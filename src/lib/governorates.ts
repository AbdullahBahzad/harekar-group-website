import { governorateShapes } from "@/data/iraq-governorates";
import type { GovernorateKey } from "@/lib/report-shape";

/** Ray casting: whether [lng, lat] lies inside one outline. */
function insideRing(lng: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Which governorate a point falls in, by its position on the map rather than
 * by the free-text province an operator typed (which may read "Duhok",
 * "Dohuk" or "Dahuk" for the same place). Null for a point outside every
 * outline — offshore, or across a border.
 */
export function governorateAt(lng: number, lat: number): GovernorateKey | null {
  for (const shape of governorateShapes) {
    if (shape.rings.some((ring) => insideRing(lng, lat, ring))) return shape.key;
  }
  return null;
}
