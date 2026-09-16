"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { iraqBorder } from "@/data/iraq";

export type LeafletPin = {
  id: string;
  lat: number;
  lng: number;
  /** CSS color — a `var(--color-status-*)` string, same tones used elsewhere. */
  tone: string;
  /** Draws the extra outer ring used for non-"clear" severities. */
  ring?: boolean;
  /** Animated halo — reserved for the one open, unentitled report. */
  pulse?: boolean;
  /** Unpublished/draft: rendered hollow instead of filled. */
  dim?: boolean;
  /** The public map's larger, clickable "gated report" glyph. */
  locked?: boolean;
  /** Console only — a dashed selection ring around the pin being edited. */
  selected?: boolean;
  /**
   * How many reports share this pin's spot — the public map groups markers
   * at (near enough) the same coordinates into one pin rather than stacking
   * them illegibly. Shown as a small badge when greater than 1.
   */
  count?: number;
  label?: string;
  draggable?: boolean;
  onClick?: () => void;
  onDragEnd?: (lat: number, lng: number) => void;
};

/**
 * The real Iraq — OpenStreetMap tiles, dark-filtered to match the site, with
 * the country's own border traced in gold on top. Replaces the earlier
 * illustrated country shape: this is the same approach the `iraq mmap`
 * reference project uses (Leaflet + OSM, not the Google Maps JS API, which
 * needs a billed API key this project does not have).
 *
 * Vanilla Leaflet rather than `react-leaflet`: the map's lifecycle is
 * imperative and short — create it once, mutate its marker layer when props
 * change, tear it down on unmount — which a plain `useEffect` handles without
 * pulling in a wrapper library to hold no more than a ref would.
 */
export default function IraqLeafletMap({
  markers,
  draftPoint,
  onMapClick,
  maskOutside,
  className,
  ariaLabel,
}: {
  markers: LeafletPin[];
  /** A pin for a spot chosen but not yet saved — console only. */
  draftPoint?: { lat: number; lng: number } | null;
  /** Present only on the console map, where clicking ground starts a marker. */
  onMapClick?: (lat: number, lng: number) => void;
  /**
   * Hides everything outside Iraq under a solid plate, so the map reads as
   * "Iraq, alone" rather than a regional view that happens to have Iraq
   * highlighted. Off by default — the console wants the neighbouring
   * streets visible for placing pins near a border.
   */
  maskOutside?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  /*
   * Handlers are read from a ref inside the Leaflet click listener instead of
   * being a dependency of the setup effect. The map itself must only be
   * built once; re-running `L.map()` on every render would tear down the
   * user's current pan/zoom to apply a new closure.
   */
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const bounds = L.latLngBounds(
      iraqBorder.map(([lng, lat]) => [lat, lng] as [number, number]),
    );

    const map = L.map(container, {
      zoomControl: false,
      attributionControl: true,
      maxBounds: bounds.pad(0.12),
      maxBoundsViscosity: 1,
      zoomSnap: 0.25,
      worldCopyJump: false,
    });
    mapRef.current = map;

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      minZoom: 0,
      noWrap: true,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    }).addTo(map);

    if (maskOutside) {
      /*
       * A polygon with two rings: a huge outer square and Iraq as a hole cut
       * out of it. Leaflet fills by the even-odd rule, so what's left
       * painted is everything *except* Iraq — neighbouring countries read as
       * the site's own background instead of a competing map.
       */
      L.polygon(
        [
          [
            [85, -170],
            [85, 170],
            [-85, 170],
            [-85, -170],
          ],
          iraqBorder.map(([lng, lat]) => [lat, lng] as [number, number]),
        ],
        {
          color: "transparent",
          fillColor: "var(--color-ink)",
          fillOpacity: 1,
          stroke: false,
          interactive: false,
        },
      ).addTo(map);
    }

    L.polygon(
      iraqBorder.map(([lng, lat]) => [lat, lng] as [number, number]),
      {
        color: "var(--color-gold-bright)",
        weight: 1.6,
        opacity: 0.9,
        fill: false,
        interactive: false,
      },
    ).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    map.fitBounds(bounds, { padding: [24, 24] });
    map.setMinZoom(map.getBoundsZoom(bounds, false, L.point(24, 24)));

    layerRef.current = L.layerGroup().addTo(map);

    map.on("click", (event: L.LeafletMouseEvent) => {
      onMapClickRef.current?.(event.latlng.lat, event.latlng.lng);
    });

    // Leaflet sizes itself from the container's box at creation time; this
    // frame runs after the surrounding CSS grid has settled.
    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // `maskOutside` is a fixed per-caller choice, not runtime state — see the
    // prop doc. Included so the map does rebuild if a caller ever did change it.
  }, [maskOutside]);

  // Marker layer — rebuilt whenever the pins or the draft point change.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();

    for (const pin of markers) {
      const size = pin.locked ? 26 : 18;
      const countBadge =
        pin.count && pin.count > 1
          ? `<b class="harekar-pin-count">${pin.count > 99 ? "99+" : pin.count}</b>`
          : "";
      const icon = L.divIcon({
        className: pin.onClick
          ? "harekar-pin-wrap harekar-pin-clickable"
          : "harekar-pin-wrap",
        html: pin.locked
          ? `
            ${pin.pulse ? `<span class="harekar-pin-pulse" style="--tone:${pin.tone}"></span>` : ""}
            <span class="harekar-pin-locked" style="--tone:${pin.tone}">
              <span class="harekar-pin-locked-glyph" aria-hidden="true">!</span>
            </span>
            ${countBadge}
          `
          : `
            ${pin.pulse ? `<span class="harekar-pin-pulse" style="--tone:${pin.tone}"></span>` : ""}
            ${pin.selected ? `<span class="harekar-pin-selected"></span>` : ""}
            ${pin.ring ? `<span class="harekar-pin-ring" style="--tone:${pin.tone}"></span>` : ""}
            <span class="harekar-pin" style="--tone:${pin.tone};${pin.dim ? "background:var(--color-ink);" : ""}"></span>
            ${countBadge}
          `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([pin.lat, pin.lng], {
        icon,
        draggable: Boolean(pin.draggable),
        keyboard: true,
        title: pin.label,
        alt: pin.label ?? "",
      }).addTo(layer);

      if (pin.label) {
        marker.bindTooltip(pin.label, {
          permanent: true,
          direction: "right",
          offset: [size / 2 - 1, 1],
          className: "harekar-pin-label",
          interactive: false,
        });
      }
      if (pin.onClick) {
        marker.on("click", (event: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(event);
          pin.onClick?.();
        });
      }
      if (pin.draggable && pin.onDragEnd) {
        marker.on("dragend", (event) => {
          const { lat, lng } = (event.target as L.Marker).getLatLng();
          pin.onDragEnd?.(lat, lng);
        });
      }
    }

    if (draftPoint) {
      const icon = L.divIcon({
        className: "harekar-pin-wrap",
        html: `<span class="harekar-pin-draft"><span class="harekar-pin-draft-dot"></span></span>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([draftPoint.lat, draftPoint.lng], {
        icon,
        interactive: false,
        keyboard: false,
      }).addTo(layer);
    }
  }, [markers, draftPoint]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label={ariaLabel}
      className={`iraq-leaflet ${className ?? ""}`}
    />
  );
}
