"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import "leaflet/dist/leaflet.css";
import MarkerReportDialog from "@/components/MarkerReportDialog";
import IraqMap from "@/components/IraqMap";
import {
  IRAQ_BOUNDS,
  severityColor,
  type IntelMarker,
  type MarkerSeverity,
} from "@/data/iraq";

const severityOrder: MarkerSeverity[] = ["clear", "elevated", "critical"];

/**
 * Severity colours as literal hex.
 *
 * `severityColor` gives `var(--color-status-…)`, which is what SVG inside the
 * document resolves; a marker is built as an HTML string handed to Leaflet, and
 * inline `style` on it resolves custom properties against the document too — so
 * either would work. Literals are used anyway to keep the glyph readable in
 * isolation, and they are the same three values `globals.css` defines.
 */
const severityHex: Record<MarkerSeverity, string> = {
  clear: "#4ba07a",
  elevated: "#d9a441",
  critical: "#d2564b",
};

/**
 * Zoom at which the map stops being an overview and starts being a street map.
 *
 * The tiles do the decluttering themselves — CARTO's dark basemap carries no
 * point-of-interest icons at all, and reveals place names by importance as you
 * descend, so the whole country shows governorate seats and major cities while
 * street names only appear once you are close enough for them to mean
 * something. This constant is only the point at which the map *says* which
 * mode it is in.
 */
const DETAIL_ZOOM = 11;

/** The country, with a margin so the border is never flush against the frame. */
const BOUNDS: [[number, number], [number, number]] = [
  [IRAQ_BOUNDS.minLat - 1.5, IRAQ_BOUNDS.minLon - 1.5],
  [IRAQ_BOUNDS.maxLat + 1.5, IRAQ_BOUNDS.maxLon + 1.5],
];

/**
 * A marker's glyph, as the HTML Leaflet places at a coordinate.
 *
 * Drawn rather than dropped in as a stock pin because the two cues this map
 * needs beyond position — the ring on a raised posture, the padlock on a gated
 * report — must not be carried by colour alone.
 */
function markerHtml(marker: IntelMarker): string {
  const tone = severityHex[marker.severity];
  const locked = marker.access === "locked";
  const c = 22;

  const ring =
    marker.severity === "clear"
      ? ""
      : `<circle cx="${c}" cy="${c}" r="11" fill="none" stroke="#0b0b0b" stroke-opacity="0.55" stroke-width="3.4"/>
         <circle cx="${c}" cy="${c}" r="11" fill="none" stroke="${tone}" stroke-width="1.7"/>`;

  const body = locked
    ? `<circle cx="${c}" cy="${c}" r="8.5" fill="#0b0b0b" stroke="${tone}" stroke-width="2"/>
       <path d="M ${c} ${c - 4.4} L ${c + 4.2} ${c + 3.2} L ${c - 4.2} ${c + 3.2} Z" fill="none" stroke="${tone}" stroke-width="1.6" stroke-linejoin="round"/>
       <path d="M ${c} ${c - 1.4} L ${c} ${c + 0.7}" stroke="${tone}" stroke-width="1.6" stroke-linecap="round"/>
       <circle cx="${c}" cy="${c + 2.2}" r="0.8" fill="${tone}"/>
       <rect x="${c + 7}" y="${c - 12}" width="8" height="6" rx="1.4" fill="#0b0b0b" stroke="#f2d27d" stroke-width="1.2"/>
       <path d="M ${c + 8.7} ${c - 12} v -1.8 a 1.6 1.6 0 0 1 3.2 0 v 1.8" fill="none" stroke="#f2d27d" stroke-width="1.2"/>`
    : `<circle cx="${c}" cy="${c}" r="5.4" fill="${tone}" stroke="#0b0b0b" stroke-width="2"/>`;

  /*
   * The label is part of the marker rather than a separate layer, so it can
   * never drift away from the point it names. `white-space: nowrap` and the
   * centring transform keep it legible over the tiles beneath it.
   */
  return `<div class="intel-marker">
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">${ring}${body}</svg>
    <span class="intel-marker__label">${escapeHtml(marker.label)}</span>
  </div>`;
}

/** Labels come from the console, so they are text, not markup. */
function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch] as string,
  );
}

export default function IraqOpenMap({
  markers,
}: {
  /** The published picture, resolved on the server — see `lib/intel.ts`. */
  markers: IntelMarker[];
}) {
  const t = useTranslations("intelligence");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const wheelKeyRef = useRef<((event: KeyboardEvent) => void) | null>(null);
  const [active, setActive] = useState<IntelMarker | null>(null);
  const [detailed, setDetailed] = useState(false);
  const [failed, setFailed] = useState(false);
  /*
   * Leaflet is imported dynamically — it touches `window` at module scope and
   * cannot be evaluated during server rendering. A ref assignment does not
   * re-render, so this flag is what tells the marker effect below that
   * `mapRef.current` is safe to read.
   */
  const [ready, setReady] = useState(false);

  const close = useCallback(() => setActive(null), []);

  useEffect(() => {
    let cancelled = false;

    import("leaflet")
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
          center: [
            (IRAQ_BOUNDS.minLat + IRAQ_BOUNDS.maxLat) / 2,
            (IRAQ_BOUNDS.minLon + IRAQ_BOUNDS.maxLon) / 2,
          ],
          zoom: 6,
          /*
           * Zoom is the point of this map: out to the whole country, in to the
           * street an alert sits on. 5 is roughly Iraq filling the frame —
           * below that it becomes a speck in a region there is no reporting
           * on. 19 is the deepest the tiles are drawn at.
           */
          minZoom: 5,
          maxZoom: 19,
          maxBounds: BOUNDS,
          maxBoundsViscosity: 0.9,
          zoomControl: true,
          attributionControl: true,
          /*
           * Off by default so scrolling the page past the map does not zoom it
           * instead. Leaflet has no cooperative-gesture mode of its own, so the
           * modifier below supplies one; the +/− controls, double-click and
           * touch pinch all still zoom without it.
           */
          scrollWheelZoom: false,
        });

        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          {
            // Required by both the tile host and the data licence.
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 19,
          },
        ).addTo(map);

        layerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;

        const syncZoom = () => setDetailed(map.getZoom() >= DETAIL_ZOOM);
        map.on("zoomend", syncZoom);
        syncZoom();

        /*
         * Wheel zoom while ctrl/⌘ is held — the convention every embedded map
         * uses, and the escape hatch for a reader who does want to zoom with
         * the wheel rather than the buttons.
         */
        wheelKeyRef.current = (event: KeyboardEvent) => {
          if (event.ctrlKey || event.metaKey) map.scrollWheelZoom.enable();
          else map.scrollWheelZoom.disable();
        };
        window.addEventListener("keydown", wheelKeyRef.current);
        window.addEventListener("keyup", wheelKeyRef.current);

        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (wheelKeyRef.current) {
        window.removeEventListener("keydown", wheelKeyRef.current);
        window.removeEventListener("keyup", wheelKeyRef.current);
        wheelKeyRef.current = null;
      }
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  /* Put the published markers on it, and keep them in step with the props. */
  useEffect(() => {
    const layer = layerRef.current;
    if (!ready || !layer) return;

    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled) return;
      layer.clearLayers();

      markers.forEach((entry) => {
        const [lng, lat] = entry.coordinates;
        const locked = entry.access === "locked";

        const marker = L.marker([lat, lng], {
          title: entry.label,
          keyboard: true,
          alt: entry.label,
          icon: L.divIcon({
            html: markerHtml(entry),
            className: "intel-marker__wrap",
            iconSize: [44, 44],
            iconAnchor: [22, 22],
          }),
          // Critical first, so an alert is never buried under a quiet city.
          zIndexOffset:
            entry.severity === "critical" ? 300 : locked ? 200 : 100,
        });

        /*
         * Only a marker with something to say opens the dialog: a gated one,
         * whose whole point is the upgrade conversation, or an open one whose
         * assessment the server actually sent. A published-but-unwritten open
         * marker stays a pin, rather than opening a panel that would offer Pro
         * for a report nobody has written.
         */
        if (locked || entry.body) {
          marker.on("click", () => setActive(entry));
          marker.on("keypress", (event) => {
            const key = (event.originalEvent as KeyboardEvent).key;
            if (key === "Enter" || key === " ") setActive(entry);
          });
        }

        marker.addTo(layer);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [markers, ready]);

  /*
   * Tiles unreachable or the library failed to load: fall back to the drawn
   * country rather than an empty frame. It carries the same published markers,
   * so the page still answers the question it exists to answer.
   */
  if (failed) return <IraqMap markers={markers} />;

  return (
    <>
      <div className="border-bone/14 bg-surface/20 relative overflow-hidden rounded-3xl border p-2 sm:p-4">
        <div
          ref={containerRef}
          role="application"
          aria-label={t("title")}
          /*
           * Grows with the viewport rather than sitting at a fixed height: the
           * whole country has to fit at the default zoom, and a short frame
           * would crop it north-to-south.
           */
          className="intel-map h-[26rem] w-full overflow-hidden rounded-2xl sm:h-[34rem] lg:h-[40rem]"
        />

        <div className="border-bone/14 text-bone/55 mt-6 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 border-t pt-6 text-xs">
          {severityOrder.map((level) => (
            <span key={level} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: severityColor[level] }}
              />
              {t(`severity.${level}`)}
            </span>
          ))}
          <span className="text-gold-bright/80 flex items-center gap-2">
            <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
              <rect
                x="2.2"
                y="5"
                width="7.6"
                height="5.4"
                rx="1.2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
              />
              <path
                d="M4 5V3.4a2 2 0 0 1 4 0V5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
              />
            </svg>
            {t("legendLocked")}
          </span>
          <span className="text-bone/40">
            {detailed ? t("zoomDetail") : t("zoomOverview")}
          </span>
        </div>
      </div>

      <MarkerReportDialog marker={active} onClose={close} />
    </>
  );
}
