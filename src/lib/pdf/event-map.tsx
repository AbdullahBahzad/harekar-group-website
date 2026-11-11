import { Polygon, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { IRAQ_BOUNDS, iraqBorder } from "@/data/iraq";
import { governorateShapes } from "@/data/iraq-governorates";
import { eventPin } from "@/lib/report-geo";
import type { ReportNewsItem } from "@/lib/report-shape";
import {
  CATEGORY_COLOR,
  CATEGORY_HEADING,
  CLASSIFICATION_LABEL,
  GOVERNORATE_LABEL,
  UNCATEGORISED_COLOR,
  UNCATEGORISED_HEADING,
  categoryColor,
  locationLine,
} from "./report-labels";

/**
 * An event map for report PDFs: Iraq's border and governorates drawn as
 * vectors, zoomed to the events being shown, with a numbered pin per event
 * and a key listing them.
 *
 * Drawn from the boundary data the site already ships rather than map tiles,
 * so a PDF renders offline, identically every time, with no tile-server terms
 * to satisfy. Shared by every report type: a daily map is just this with one
 * day's events, a weekly map with a week's.
 *
 * Numbers are the caller's: an event's number here matches the number printed
 * beside it in the report body.
 */

export type MappedEvent = { number: number; item: ReportNewsItem; dateLabel?: string };

/** Default drawing size; a caller placing the map in a narrower box passes `width`. */
const MAP_W = 531;
const MAP_H = 380;
const PIN = 13;

/** The smallest span the map zooms to, in degrees of latitude — about 280km. */
const MIN_SPAN_LAT = 2.5;

type Bounds = { minLon: number; maxLon: number; minLat: number; maxLat: number };

/** Fits the pins, padded, at the map's aspect ratio, clamped to Iraq. */
function fitBounds(points: { lat: number; lng: number }[], width: number, height: number): Bounds {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const k = Math.cos((midLat * Math.PI) / 180);

  let spanLat = Math.max(Math.max(...lats) - Math.min(...lats) + 1.2, MIN_SPAN_LAT);
  let spanLon = Math.max(...lngs) - Math.min(...lngs) + 1.2;
  // Widen whichever side is short so the box matches the map's shape.
  const aspect = width / height;
  if ((spanLon * k) / spanLat < aspect) spanLon = (spanLat * aspect) / k;
  else spanLat = (spanLon * k) / aspect;

  const cLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const cLon = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const fullLat = IRAQ_BOUNDS.maxLat - IRAQ_BOUNDS.minLat;
  if (spanLat >= fullLat) {
    // Nationwide: show all of Iraq, centred.
    spanLat = fullLat + 0.4;
    spanLon = (spanLat * aspect) / k;
    const lon0 = (IRAQ_BOUNDS.minLon + IRAQ_BOUNDS.maxLon) / 2;
    const lat0 = (IRAQ_BOUNDS.minLat + IRAQ_BOUNDS.maxLat) / 2;
    return {
      minLon: lon0 - spanLon / 2,
      maxLon: lon0 + spanLon / 2,
      minLat: lat0 - spanLat / 2,
      maxLat: lat0 + spanLat / 2,
    };
  }
  return {
    minLon: cLon - spanLon / 2,
    maxLon: cLon + spanLon / 2,
    minLat: cLat - spanLat / 2,
    maxLat: cLat + spanLat / 2,
  };
}

function projector(b: Bounds, height: number) {
  const k = Math.cos((((b.minLat + b.maxLat) / 2) * Math.PI) / 180);
  const scale = height / (b.maxLat - b.minLat);
  return (lng: number, lat: number) => ({
    x: (lng - b.minLon) * k * scale,
    y: (b.maxLat - lat) * scale,
  });
}

const styles = StyleSheet.create({
  frame: {
    width: MAP_W,
    height: MAP_H,
    position: "relative",
    overflow: "hidden",
    borderWidth: 0.75,
    borderColor: "#b9b2a3",
  },
  placeLabel: {
    fontFamily: "Caladea",
    position: "absolute",
    fontSize: 6.5,
    color: "#8f877a",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  pin: {
    position: "absolute",
    width: PIN,
    height: PIN,
    borderRadius: PIN / 2,
    borderWidth: 1.2,
    alignItems: "center",
    justifyContent: "center",
  },
  pinText: { fontSize: 6.5, fontFamily: "Caladea", fontWeight: "bold" },
  keyRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6, marginBottom: 8 },
  keyItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  keySwatch: { width: 7, height: 7, borderRadius: 3.5 },
  keyText: { fontSize: 7, color: "#555" },
  note: { fontSize: 7, color: "#777", marginBottom: 6 },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1a1712",
    paddingBottom: 2,
    marginBottom: 1,
  },
  th: { fontSize: 7, fontFamily: "Caladea", fontWeight: "bold", color: "#555", textTransform: "uppercase" },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
    paddingVertical: 2.5,
  },
  colNo: { width: "7%", fontSize: 7.5, fontFamily: "Caladea", fontWeight: "bold" },
  colDate: { width: "13%", fontSize: 7.5 },
  colTitle: { width: "45%", fontSize: 7.5 },
  colPlace: { width: "22%", fontSize: 7.5, color: "#444" },
  colType: { width: "13%", fontSize: 7.5, color: "#444" },
});

export function EventMap({ events, width = MAP_W }: { events: MappedEvent[]; width?: number }) {
  const mapW = width;
  const mapH = Math.round((width * MAP_H) / MAP_W);
  const placed = events
    .map((event) => ({ ...event, pin: eventPin(event.item) }))
    .filter((event): event is MappedEvent & { pin: NonNullable<ReturnType<typeof eventPin>> } =>
      Boolean(event.pin),
    );
  if (placed.length === 0) return null;

  const project = projector(fitBounds(placed.map((event) => event.pin), mapW, mapH), mapH);
  const points = (ring: [number, number][]) =>
    ring
      .map(([lng, lat]) => {
        const { x, y } = project(lng, lat);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  // Several events at one spot (most often a governorate centre) fan out in a
  // small ring so every number stays readable.
  const seen = new Map<string, number>();
  const pins = placed.map((event) => {
    const { x, y } = project(event.pin.lng, event.pin.lat);
    const key = `${Math.round(x / 6)}:${Math.round(y / 6)}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    const angle = (n * Math.PI) / 3;
    const r = n === 0 ? 0 : PIN * (1 + Math.floor((n - 1) / 6) * 0.9);
    return { event, x: x + Math.cos(angle) * r, y: y + Math.sin(angle) * r };
  });

  const labels = governorateShapes
    .map((shape) => {
      const largest = shape.rings.reduce((a, b) => (b.length > a.length ? b : a));
      const lng = largest.reduce((sum, [x]) => sum + x, 0) / largest.length;
      const lat = largest.reduce((sum, [, y]) => sum + y, 0) / largest.length;
      return { key: shape.key, ...project(lng, lat) };
    })
    .filter(({ x, y }) => x > 20 && x < mapW - 60 && y > 10 && y < mapH - 10);

  const categoriesShown = [
    ...new Set(placed.map((event) => event.item.category ?? null)),
  ];
  const approximate = placed.some((event) => event.pin.approximate);
  const showDates = events.some((event) => event.dateLabel);

  return (
    <View>
      <View style={[styles.frame, { width: mapW, height: mapH }]}>
        <Svg width={mapW} height={mapH}>
          <Rect x={0} y={0} width={mapW} height={mapH} fill="#e8ecee" />
          <Polygon points={points(iraqBorder)} fill="#f8f5ee" stroke="#6f675a" strokeWidth={1} />
          {governorateShapes.flatMap((shape) =>
            shape.rings.map((ring, i) => (
              <Polygon
                key={`${shape.key}-${i}`}
                points={points(ring)}
                fill="none"
                stroke="#c7bda8"
                strokeWidth={0.6}
              />
            )),
          )}
        </Svg>

        {labels.map((label) => (
          // Below the centre point: hollow "governorate only" pins sit exactly
          // on it, and a label there would run underneath them.
          <Text key={label.key} style={[styles.placeLabel, { left: label.x - 20, top: label.y + 9 }]}>
            {GOVERNORATE_LABEL[label.key]}
          </Text>
        ))}

        {pins.map(({ event, x, y }) => {
          const color = categoryColor(event.item.category);
          return (
            <View
              key={event.number}
              style={[
                styles.pin,
                {
                  left: x - PIN / 2,
                  top: y - PIN / 2,
                  borderColor: color,
                  backgroundColor: event.pin.approximate ? "#ffffff" : color,
                },
              ]}
            >
              <Text style={[styles.pinText, { color: event.pin.approximate ? color : "#ffffff" }]}>
                {event.number}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.keyRow}>
        {categoriesShown.map((category) => (
          <View key={category ?? "none"} style={styles.keyItem}>
            <View
              style={[
                styles.keySwatch,
                { backgroundColor: category ? CATEGORY_COLOR[category] : UNCATEGORISED_COLOR },
              ]}
            />
            <Text style={styles.keyText}>
              {category ? CATEGORY_HEADING[category] : UNCATEGORISED_HEADING}
            </Text>
          </View>
        ))}
      </View>
      {approximate && (
        <Text style={styles.note}>
          Hollow pins mark events located only to their governorate; they are drawn at its centre.
        </Text>
      )}

      <View style={styles.tableHead}>
        <Text style={[styles.th, styles.colNo]}>No.</Text>
        {showDates && <Text style={[styles.th, styles.colDate]}>Date</Text>}
        <Text style={[styles.th, showDates ? styles.colTitle : { width: "58%" }]}>Event</Text>
        <Text style={[styles.th, styles.colPlace]}>Location</Text>
        <Text style={[styles.th, styles.colType]}>Type</Text>
      </View>
      {placed.map((event) => (
        <View key={event.number} style={styles.row} wrap={false}>
          <Text style={styles.colNo}>{event.number}</Text>
          {showDates && <Text style={styles.colDate}>{event.dateLabel ?? ""}</Text>}
          <Text style={[styles.colTitle, showDates ? {} : { width: "58%" }]}>{event.item.title}</Text>
          <Text style={styles.colPlace}>{locationLine(event.item) || "—"}</Text>
          <Text style={styles.colType}>
            {event.item.classification ? CLASSIFICATION_LABEL[event.item.classification] : "—"}
          </Text>
        </View>
      ))}
    </View>
  );
}
