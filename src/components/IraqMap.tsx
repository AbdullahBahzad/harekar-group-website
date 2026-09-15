"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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
  const signedIn = Boolean(session?.user);
  const isPro = Boolean(session?.user?.isPro);
  const reduceMotion = useReducedMotion();
  const [activeMarker, setActiveMarker] = useState<IntelMarker | null>(null);

  // Close the report dialog on Escape.
  useEffect(() => {
    if (!activeMarker) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveMarker(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeMarker]);

  const pins = useMemo<LeafletPin[]>(
    () =>
      markers.map((marker) => {
        const locked = marker.access === "locked";
        return {
          id: marker.id,
          lat: marker.coordinates[1],
          lng: marker.coordinates[0],
          tone: severityColor[marker.severity],
          label: marker.label,
          ring: !locked && marker.severity !== "clear",
          locked,
          pulse: locked && !reduceMotion,
          onClick: locked ? () => setActiveMarker(marker) : undefined,
        };
      }),
    [markers, reduceMotion],
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

      <AnimatePresence>
        {activeMarker && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label={t("modal.close")}
              onClick={() => setActiveMarker(null)}
              className="bg-ink/80 absolute inset-0 backdrop-blur-sm"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="report-title"
              initial={
                reduceMotion ? false : { opacity: 0, y: 18, scale: 0.97 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 12, scale: 0.98 }
              }
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="border-gold/40 bg-surface/95 relative w-full max-w-md rounded-2xl border p-8 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.9)]"
            >
              <span className="border-gold/50 text-gold inline-block rounded-full border px-3 py-1 text-[10px] tracking-[0.25em] uppercase">
                {isPro ? t("modal.badgePro") : t("modal.badge")}
              </span>

              {/*
               * The written assessment is present only when the server decided
               * this reader may have it — an unentitled reader's payload has no
               * `body` at all, so there is nothing here to reveal. When a
               * marker simply has not been written up yet, the awaiting-copy
               * line stands in for a Pro reader, and the upgrade pitch still
               * shows for everyone else.
               */}
              <h2
                id="report-title"
                className="font-display text-bone mt-5 text-2xl leading-snug"
              >
                {activeMarker.body
                  ? (activeMarker.headline ?? activeMarker.label)
                  : isPro
                    ? t("modal.titlePro", { city: activeMarker.label })
                    : t("modal.title")}
              </h2>
              <p className="text-bone/70 mt-4 text-sm leading-relaxed whitespace-pre-wrap">
                {activeMarker.body
                  ? activeMarker.body
                  : isPro
                    ? t("modal.bodyPro")
                    : t("modal.body")}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {/*
                 * Three states, not two. A signed-out visitor is sent to
                 * register, a signed-in Standard account to the upgrade
                 * conversation, and a Pro account is not sold anything it
                 * already has.
                 *
                 * UPGRADE_DESTINATION: change this href when the billing /
                 * pricing flow exists.
                 */}
                {!isPro && (
                  <Link
                    href={signedIn ? "/pro" : "/register"}
                    className="bg-gold text-ink hover:bg-gold-bright rounded-full px-6 py-2.5 text-sm font-medium transition-colors"
                  >
                    {signedIn ? t("modal.upgrade") : t("modal.createAccount")}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setActiveMarker(null)}
                  className="border-bone/26 text-bone/70 hover:text-bone rounded-full border px-6 py-2.5 text-sm transition-colors"
                >
                  {isPro ? t("modal.close") : t("modal.dismiss")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
