"use client";

import { useCallback, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import MarkerReportDialog from "@/components/MarkerReportDialog";
import {
  euphrates,
  iraqBorder,
  MAP_HEIGHT,
  MAP_WIDTH,
  project,
  severityColor,
  tigris,
  toPath,
  type IntelMarker,
  type MarkerSeverity,
} from "@/data/iraq";

const severityOrder: MarkerSeverity[] = ["clear", "elevated", "critical"];

export default function IraqMap({
  markers,
}: {
  /**
   * The published picture, resolved on the server. Passed in rather than
   * imported so the console controls what renders here — see
   * `lib/intel.ts`.
   */
  markers: IntelMarker[];
}) {
  const t = useTranslations("intelligence");
  const reduceMotion = useReducedMotion();
  const [activeMarker, setActiveMarker] = useState<IntelMarker | null>(null);
  const closeMarker = useCallback(() => setActiveMarker(null), []);

  return (
    <>
      <div className="border-bone/14 bg-surface/20 relative overflow-hidden rounded-3xl border p-2 sm:p-8">
        {/*
         * Iraq's outline is close to square, so width alone cannot bound this:
         * at the full column width the map stood taller than the viewport and
         * ran off the bottom of the screen. Capping the width by viewport
         * *height* as well keeps the whole country, its legend and its frame
         * visible at once, which is the only way this reads as a dashboard
         * rather than something to scroll through.
         *
         * The height term stays below 100svh on purpose — it has to leave room
         * for the frame's own padding and the legend beneath it, or the country
         * grows until the legend is pushed off the fold.
         */}
        <div
          className="mx-auto w-full"
          style={{ maxWidth: "min(84rem, 84svh)" }}
        >
          <svg
            viewBox={`-20 -20 ${MAP_WIDTH + 40} ${MAP_HEIGHT + 40}`}
            className="block h-auto w-full"
            role="img"
            aria-label={t("title")}
          >
            <defs>
              {/*
               * Lit from the north-west, so the landmass reads as a solid
               * struck-metal plate rather than a flat swatch.
               */}
              <linearGradient id="iraq-fill" x1="0" y1="0" x2="0.6" y2="1">
                <stop offset="0%" stopColor="var(--color-gold-bright)" />
                <stop offset="45%" stopColor="var(--color-gold)" />
                <stop offset="100%" stopColor="#8d6d24" />
              </linearGradient>
            </defs>

            {/*
             * The country as solid gold. It arrives as a fill fading up under
             * the outline that draws it, rather than appearing whole the
             * instant the stroke starts — the border still traces the shape,
             * the gold then floods it.
             */}
            <motion.path
              d={toPath(iraqBorder, true)}
              fill="url(#iraq-fill)"
              stroke="none"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 1.1,
                delay: 0.35,
                ease: [0.22, 1, 0.36, 1],
              }}
            />

            {/* The illuminated edge, drawn on. */}
            <motion.path
              d={toPath(iraqBorder, true)}
              fill="none"
              stroke="var(--color-gold-bright)"
              strokeWidth="1.6"
              strokeLinejoin="round"
              initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
            />

            {/* Rivers */}
            {[tigris, euphrates].map((river, i) => (
              <motion.path
                key={i}
                d={toPath(river)}
                fill="none"
                // Dark on the gold now rather than pale on the dark: the two
                // rivers read as engraved into the plate.
                stroke="var(--color-ink)"
                strokeOpacity="0.3"
                strokeWidth="1.3"
                strokeLinecap="round"
                initial={reduceMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.4, delay: 0.5 + i * 0.15 }}
              />
            ))}

            {/* Markers */}
            {markers.map((marker, index) => {
              const { x, y } = project(marker.coordinates);
              const locked = marker.access === "locked";
              const tone = severityColor[marker.severity];

              if (!locked) {
                return (
                  <motion.g
                    key={marker.id}
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.1 + index * 0.08 }}
                  >
                    {/*
                     * Dark collar around every marker. `elevated` is #d9a441
                     * against a #c59c40 plate — near enough the same colour
                     * that without this the marker would dissolve into the
                     * country it is meant to flag.
                     */}
                    <circle
                      cx={x}
                      cy={y}
                      r="3.9"
                      fill={tone}
                      stroke="var(--color-ink)"
                      strokeWidth="1.3"
                    />
                    {/* Ring doubles the severity cue so it is not colour-only. */}
                    {marker.severity !== "clear" && (
                      <>
                        <circle
                          cx={x}
                          cy={y}
                          r="7"
                          fill="none"
                          stroke="var(--color-ink)"
                          strokeOpacity="0.45"
                          strokeWidth="2.2"
                        />
                        <circle
                          cx={x}
                          cy={y}
                          r="7"
                          fill="none"
                          stroke={tone}
                          strokeWidth="1.1"
                        />
                      </>
                    )}
                    <text
                      x={x + 11}
                      y={y + 4}
                      // Ink on gold. The old pale bone was tuned for a dark
                      // background and would sit almost invisibly on the fill.
                      fill="var(--color-ink)"
                      fillOpacity="0.8"
                      fontSize="11.5"
                      fontWeight="500"
                    >
                      {marker.label}
                    </text>
                  </motion.g>
                );
              }

              return (
                <motion.g
                  key={marker.id}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 1.4,
                    type: "spring",
                    stiffness: 200,
                    damping: 18,
                  }}
                  style={{ originX: `${x}px`, originY: `${y}px` }}
                >
                  {/* Pulsing halo draws the eye to the one clickable point. */}
                  {!reduceMotion && (
                    <motion.circle
                      cx={x}
                      cy={y}
                      r="9"
                      fill="none"
                      stroke={tone}
                      strokeWidth="1.2"
                      initial={{ scale: 0.7, opacity: 0.8 }}
                      animate={{ scale: 2.4, opacity: 0 }}
                      transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                      style={{ transformOrigin: `${x}px ${y}px` }}
                    />
                  )}

                  <g
                    role="button"
                    tabIndex={0}
                    aria-label={`${marker.label} — ${t("legendLocked")}`}
                    onClick={() => setActiveMarker(marker)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveMarker(marker);
                      }
                    }}
                    className="cursor-pointer focus:outline-none"
                  >
                    {/*
                     * Invisible hit area, sized for a thumb rather than the
                     * visible glyph — at the map's default rendered width
                     * r=16 worked out to roughly a 15px tap target, well
                     * under the ~44px touch minimum. 24 clears that with
                     * room to spare between the five markers on this map.
                     */}
                    <circle cx={x} cy={y} r="24" fill="transparent" />
                    <circle
                      cx={x}
                      cy={y}
                      r="9"
                      fill="var(--color-ink)"
                      stroke={tone}
                      strokeWidth="1.4"
                    />
                    {/* Warning glyph */}
                    <path
                      d={`M ${x},${y - 4.6} L ${x + 4.4},${y + 3.4} L ${x - 4.4},${y + 3.4} Z`}
                      fill="none"
                      stroke={tone}
                      strokeWidth="1.2"
                      strokeLinejoin="round"
                    />
                    <path
                      d={`M ${x},${y - 1.4} L ${x},${y + 0.8}`}
                      stroke={tone}
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                    <circle cx={x} cy={y + 2.2} r="0.7" fill={tone} />
                    {/* Lock cue, so gating is not signalled by colour alone. */}
                    <path
                      d={`M ${x + 8},${y - 9} h 6 a 1.2 1.2 0 0 1 1.2 1.2 v 3.6 a 1.2 1.2 0 0 1 -1.2 1.2 h -6 a 1.2 1.2 0 0 1 -1.2 -1.2 v -3.6 a 1.2 1.2 0 0 1 1.2 -1.2 z`}
                      fill="var(--color-ink)"
                      stroke="var(--color-gold-bright)"
                      strokeWidth="0.9"
                    />
                    <path
                      d={`M ${x + 9.6},${y - 9} v -1.6 a 1.4 1.4 0 0 1 2.8 0 v 1.6`}
                      fill="none"
                      stroke="var(--color-gold-bright)"
                      strokeWidth="0.9"
                    />
                  </g>

                  <text
                    x={x + 20}
                    y={y + 4}
                    fill="var(--color-ink)"
                    fontSize="12"
                    fontWeight="600"
                    className="pointer-events-none"
                  >
                    {marker.label}
                  </text>
                </motion.g>
              );
            })}
          </svg>
        </div>

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
        </div>
      </div>

      <MarkerReportDialog marker={activeMarker} onClose={closeMarker} />
    </>
  );
}
