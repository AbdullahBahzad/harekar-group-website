/**
 * Geographic data for the intelligence map.
 *
 * Everything is stored as [longitude, latitude] and projected at render time,
 * so markers stay correctly anchored to the border. When real intelligence
 * data lands, the border can be replaced with higher-resolution GeoJSON and
 * the markers with an API response — no component changes required.
 *
 * NOTE: the border below is a deliberately simplified outline for presentation.
 * Replace it with proper GeoJSON before this is used for anything operational.
 */

export type LngLat = [number, number];

export const IRAQ_BOUNDS = {
  minLon: 38.6,
  maxLon: 48.8,
  minLat: 28.9,
  maxLat: 37.5,
};

/** Simplified national border, traced clockwise from the north-west. */
export const iraqBorder: LngLat[] = [
  [42.35, 37.11],
  [42.8, 37.32],
  [43.5, 37.24],
  [44.2, 37.34],
  [44.8, 37.14],
  [45.3, 36.7],
  [45.5, 36.4],
  [45.9, 35.8],
  [46.15, 35.1],
  [45.9, 34.6],
  [45.4, 34.1],
  [45.5, 33.6],
  [45.9, 33.1],
  [46.1, 32.95],
  [47.1, 32.5],
  [47.4, 32.1],
  [47.7, 31.8],
  [47.85, 31.0],
  [48.0, 30.5],
  [48.55, 30.1],
  [48.6, 29.95],
  [48.0, 29.98],
  [47.7, 30.1],
  [47.15, 30.1],
  [46.55, 29.1],
  [44.7, 29.2],
  [42.1, 31.1],
  [40.4, 31.9],
  [39.2, 32.2],
  [38.79, 33.37],
  [40.7, 34.4],
  [41.2, 34.8],
  [41.4, 35.6],
  [41.25, 36.5],
  [42.35, 37.11],
];

/** The two rivers, as light context so the shape does not read as a blob. */
export const tigris: LngLat[] = [
  [42.8, 37.2],
  [43.1, 36.3],
  [43.6, 35.4],
  [44.2, 34.6],
  [44.4, 33.3],
  [44.9, 32.5],
  [45.9, 31.8],
  [47.4, 31.0],
  [47.9, 30.6],
];

export const euphrates: LngLat[] = [
  [40.9, 34.4],
  [41.9, 34.2],
  [42.8, 33.9],
  [43.3, 33.4],
  [44.3, 32.5],
  [44.9, 31.9],
  [45.9, 31.4],
  [46.9, 31.0],
  [47.9, 30.6],
];

/** Whether the underlying report is gated behind the Pro plan. */
export type MarkerAccess = "open" | "locked";

/**
 * Operational severity, kept separate from access so the two can vary
 * independently — a clear area can still have a gated report.
 */
export type MarkerSeverity = "clear" | "elevated" | "critical";

export const severityColor: Record<MarkerSeverity, string> = {
  clear: "var(--color-status-clear)",
  elevated: "var(--color-status-elevated)",
  critical: "var(--color-status-critical)",
};

export type IntelMarker = {
  id: string;
  label: string;
  coordinates: LngLat;
  access: MarkerAccess;
  severity: MarkerSeverity;
};

export const intelMarkers: IntelMarker[] = [
  { id: "baghdad", label: "Baghdad", coordinates: [44.36, 33.31], access: "open", severity: "elevated" },
  { id: "basra", label: "Basra", coordinates: [47.78, 30.51], access: "open", severity: "clear" },
  { id: "mosul", label: "Mosul", coordinates: [43.13, 36.34], access: "open", severity: "elevated" },
  { id: "erbil", label: "Erbil", coordinates: [44.01, 36.19], access: "open", severity: "clear" },
  { id: "kirkuk", label: "Kirkuk", coordinates: [44.39, 35.47], access: "locked", severity: "critical" },
];

/* ---- projection ---------------------------------------------------------- */

/** Horizontal squeeze so longitude degrees are not stretched at Iraq's latitude. */
const LON_SCALE = Math.cos(
  (((IRAQ_BOUNDS.minLat + IRAQ_BOUNDS.maxLat) / 2) * Math.PI) / 180,
);
const PX_PER_DEGREE = 70;

export const MAP_WIDTH =
  (IRAQ_BOUNDS.maxLon - IRAQ_BOUNDS.minLon) * LON_SCALE * PX_PER_DEGREE;
export const MAP_HEIGHT =
  (IRAQ_BOUNDS.maxLat - IRAQ_BOUNDS.minLat) * PX_PER_DEGREE;

export function project([lon, lat]: LngLat): { x: number; y: number } {
  return {
    x: (lon - IRAQ_BOUNDS.minLon) * LON_SCALE * PX_PER_DEGREE,
    y: (IRAQ_BOUNDS.maxLat - lat) * PX_PER_DEGREE,
  };
}

export function toPath(points: LngLat[], close = false): string {
  const d = points
    .map((point, i) => {
      const { x, y } = project(point);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return close ? `${d} Z` : d;
}
