"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { rtlLocales, type Locale } from "@/i18n/routing";
import {
  severityColor,
  type IntelMarker,
  type MarkerSeverity,
} from "@/data/iraq";
import type { LeafletPin } from "@/components/IraqLeafletMap";

/*
 * Leaflet touches `window` at module load, not just when a map is created —
 * an ordinary import would crash the server render this component still gets
 * for its first paint. `ssr: false` skips that render entirely and mounts
 * the map only once the browser bundle runs.
 */
const IraqLeafletMap = dynamic(() => import("@/components/IraqLeafletMap"), {
  ssr: false,
});

const severityOrder: MarkerSeverity[] = ["clear", "elevated", "critical"];
const severityRank: Record<MarkerSeverity, number> = {
  clear: 0,
  elevated: 1,
  critical: 2,
};

type MarkerGroup = {
  key: string;
  lat: number;
  lng: number;
  markers: IntelMarker[];
};

/**
 * Markers within ~11m of each other share one pin — two reports at the same
 * facility should read as one flagged location with a count, not two dots
 * fighting for the same pixel.
 */
function groupByLocation(markers: IntelMarker[]): MarkerGroup[] {
  const groups = new Map<string, MarkerGroup>();
  for (const marker of markers) {
    const [lng, lat] = marker.coordinates;
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const group = groups.get(key);
    if (group) group.markers.push(marker);
    else groups.set(key, { key, lat, lng, markers: [marker] });
  }
  return Array.from(groups.values());
}

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
  /*
   * Entitlement is read from the session for *presentation only*. When the
   * reports themselves land they must be gated on the server too — anything
   * decided in the browser can be flipped in the browser.
   */
  const { data: session } = useSession();
  const isPro = Boolean(session?.user?.isPro);
  const reduceMotion = useReducedMotion();
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  /*
   * The panel is docked at the logical trailing edge (`inset-e-0`), which
   * Tailwind flips per direction on its own — but a `motion.div`'s `x`
   * transform is a raw pixel/percent offset with no idea which edge that is,
   * so the slide-in direction has to be told explicitly.
   */
  const isRtl = rtlLocales.includes(useLocale() as Locale);
  const offscreenX = isRtl ? "-100%" : "100%";

  const groups = useMemo(() => groupByLocation(markers), [markers]);
  const activeGroup = groups.find((g) => g.key === activeGroupKey) ?? null;

  // Close the side panel on Escape.
  useEffect(() => {
    if (!activeGroup) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveGroupKey(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeGroup]);

  const pins = useMemo<LeafletPin[]>(
    () =>
      groups.map((group) => {
        const topSeverity = group.markers.reduce<MarkerSeverity>(
          (top, marker) =>
            severityRank[marker.severity] > severityRank[top]
              ? marker.severity
              : top,
          "clear",
        );
        const locked = group.markers.some((m) => m.access === "locked");
        return {
          id: group.key,
          lat: group.lat,
          lng: group.lng,
          tone: severityColor[topSeverity],
          // A shared label for two different reports would misname one of
          // them, so the permanent tooltip only appears for a lone marker —
          // the count badge carries the rest.
          label: group.markers.length === 1 ? group.markers[0].label : undefined,
          count: group.markers.length,
          ring: !locked && topSeverity !== "clear",
          locked,
          pulse: locked && !reduceMotion,
          onClick: () => setActiveGroupKey(group.key),
        };
      }),
    [groups, reduceMotion],
  );

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
          className="mx-auto aspect-square w-full overflow-hidden rounded-2xl"
          style={{ maxWidth: "min(84rem, 84svh)" }}
        >
          <IraqLeafletMap markers={pins} maskOutside ariaLabel={t("title")} />
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

      {/*
       * The side panel: a browsing list for whatever is flagged at one spot.
       * Reading one report in full — and the only place a link to it can be
       * shared — is a step further, at its own page; see
       * `intelligence/report/[id]`.
       */}
      <AnimatePresence>
        {activeGroup && (
          <motion.div
            className="fixed inset-0 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label={t("panel.close")}
              onClick={() => setActiveGroupKey(null)}
              className="bg-ink/70 absolute inset-0 backdrop-blur-sm"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="panel-title"
              initial={reduceMotion ? false : { x: offscreenX }}
              animate={{ x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { x: offscreenX }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="border-gold/40 bg-surface/95 absolute inset-y-0 inset-e-0 flex w-full max-w-md flex-col border-s shadow-[-30px_0_90px_-30px_rgba(0,0,0,0.9)]"
            >
              <div className="border-bone/12 flex items-center justify-between border-b px-6 py-5">
                <h2
                  id="panel-title"
                  className="font-display text-bone text-lg leading-snug"
                >
                  {t("panel.title", { count: activeGroup.markers.length })}
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveGroupKey(null)}
                  aria-label={t("panel.close")}
                  className="text-bone/50 hover:text-bone flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-xl transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                {activeGroup.markers.map((marker) => {
                  const locked = marker.access === "locked";
                  const restricted = locked && !marker.body;
                  return (
                    <article
                      key={marker.id}
                      className="border-bone/14 rounded-xl border p-4"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="size-2 shrink-0 rounded-full"
                          style={{ background: severityColor[marker.severity] }}
                        />
                        <span className="text-bone/85 text-sm font-medium">
                          {marker.label}
                        </span>
                        {restricted && (
                          <span className="border-gold/50 text-gold ms-auto rounded-full border px-2 py-0.5 text-[10px] tracking-wide uppercase">
                            {t("modal.badge")}
                          </span>
                        )}
                      </div>

                      {marker.headline && (
                        <p className="text-bone mt-2 text-sm font-semibold">
                          {marker.headline}
                        </p>
                      )}
                      {marker.body && (
                        <p className="text-bone/65 mt-1 line-clamp-2 text-sm leading-relaxed">
                          {marker.body}
                        </p>
                      )}
                      {restricted && (
                        <p className="text-bone/55 mt-2 text-sm leading-relaxed">
                          {isPro ? t("modal.bodyPro") : t("modal.body")}
                        </p>
                      )}

                      <Link
                        href={`/intelligence/report/${marker.id}`}
                        className="text-gold hover:text-gold-bright mt-3 inline-flex items-center gap-1 text-sm font-medium transition-colors"
                      >
                        {t("panel.viewFullReport")}
                        <span aria-hidden>→</span>
                      </Link>
                    </article>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
