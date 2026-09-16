"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  severityColor,
  type IntelMarker,
  type MarkerSeverity,
} from "@/data/iraq";
import type { LeafletPin } from "@/components/IraqLeafletMap";
import CopyLinkButton from "@/components/CopyLinkButton";
import AuthForm from "@/app/[locale]/(site)/(auth)/AuthForm";
import { registerAccount } from "@/app/[locale]/(site)/(auth)/actions";

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
  const ta = useTranslations("auth");
  /*
   * Entitlement is read from the session for *presentation only*. When the
   * reports themselves land they must be gated on the server too — anything
   * decided in the browser can be flipped in the browser.
   */
  const { data: session } = useSession();
  const isPro = Boolean(session?.user?.isPro);
  const signedIn = Boolean(session?.user);
  const reduceMotion = useReducedMotion();
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  /*
   * A visitor tapping "Create an account" from here is mid-task, reading the
   * map — sending them to a whole new page (even in a new tab, which reads
   * as "gone" on a phone with no visible tab strip) throws that task away,
   * and a full-screen modal on top of everything reads the same way even
   * though the map is technically still there under it. The registration
   * form instead takes over the *same* side panel already used for reports
   * — the one piece of chrome that was already accepted as sitting beside
   * the map — so switching to it never covers the map any more than
   * reading a report already did. Only a *successful* submit still
   * navigates, via the sign-in redirect inside `registerAccount`, which is
   * the one point where leaving the map is actually the right outcome.
   */
  const [showSignup, setShowSignup] = useState(false);
  const locale = useLocale();

  /*
   * The panel portals to `document.body` (below) instead of rendering in
   * place. `MapStage`'s tilt animation puts a `transform` on this
   * component's own ancestor, and any transformed ancestor becomes the
   * containing block for `position: fixed` descendants — the panel was
   * being pinned to that tilted card instead of the viewport, which is
   * what made it read as cramped and overlapping the map on a phone rather
   * than covering the screen. `document.body` doesn't exist during SSR, so
   * the portal only renders once mounted on the client.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const groups = useMemo(() => groupByLocation(markers), [markers]);
  const activeGroup = groups.find((g) => g.key === activeGroupKey) ?? null;
  const panelOpen = Boolean(activeGroup) || showSignup;

  function closePanel() {
    setActiveGroupKey(null);
    setShowSignup(false);
  }

  // Close the side panel on Escape.
  useEffect(() => {
    if (!panelOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closePanel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panelOpen]);

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
         * The Pro upsell, pinned to the map itself rather than buried below
         * the fold — the restricted markers it's selling are right here.
         * Same button the reports list uses below (`upgrade`/`register`,
         * same gold-pill styling), so it reads as one CTA repeated, not two.
         */}
        {!isPro &&
          (signedIn ? (
            <Link
              href="/pro"
              className="bg-gold text-ink hover:bg-gold-bright absolute inset-x-0 top-0 z-10 mx-auto w-fit -translate-y-1/2 rounded-full px-6 py-2.5 text-sm font-medium whitespace-nowrap shadow-lg transition-colors"
            >
              {t("modal.upgrade")}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setShowSignup(true)}
              className="bg-gold text-ink hover:bg-gold-bright absolute inset-x-0 top-0 z-10 mx-auto w-fit -translate-y-1/2 cursor-pointer rounded-full px-6 py-2.5 text-sm font-medium whitespace-nowrap shadow-lg transition-colors"
            >
              {t("modal.upgrade")}
            </button>
          ))}

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
       * A bottom sheet, not a full-height side drawer — on a narrow screen
       * the drawer was `w-full`, which covered the map completely the
       * moment any report (or the signup form) opened. Docking to the
       * bottom and capping the height instead always leaves the map
       * visible above it, on any screen size. Shows a browsing list for
       * whatever is flagged at one spot, or — while `showSignup` is set —
       * the registration form taking over the same sheet in place. One
       * sheet rather than a report sheet plus a separate signup modal, so
       * opening the form never adds a second layer over the map beyond
       * what reading a report already put there.
       * Reading one report in full — and the only place a link to it can be
       * shared — is a step further, at its own page; see
       * `intelligence/report/[id]`.
       */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {panelOpen && (
              <motion.div
                className="fixed inset-0 z-[60] flex items-end justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/*
                 * A light scrim, not the previous dark blurred one — that
                 * blur reached the map above the sheet too and defeated the
                 * point of leaving it visible. This just signals the sheet
                 * is modal without hiding what's behind it.
                 */}
                <button
                  type="button"
                  aria-label={t("panel.close")}
                  onClick={closePanel}
                  className="bg-ink/25 absolute inset-0"
                />

                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="panel-title"
                  initial={reduceMotion ? false : { y: "100%" }}
                  animate={{ y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="border-gold/40 bg-surface/95 relative flex max-h-[75svh] w-full max-w-2xl flex-col rounded-t-3xl border-t shadow-[0_-30px_90px_-30px_rgba(0,0,0,0.9)]"
                >
                  <div className="border-bone/12 flex items-center justify-between border-b px-6 py-5">
                    <h2
                      id="panel-title"
                      className="font-display text-bone text-lg leading-snug"
                    >
                      {showSignup
                        ? ta("registerTitle")
                        : t("panel.title", { count: activeGroup?.markers.length ?? 0 })}
                    </h2>
                    <button
                      type="button"
                      onClick={closePanel}
                      aria-label={t("panel.close")}
                      className="text-bone/50 hover:text-bone flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-xl transition-colors"
                    >
                      ×
                    </button>
                  </div>

                  {showSignup ? (
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                      {/*
                       * Back to the report rather than just closing, when
                       * there is one to go back to — arriving here from a
                       * restricted marker shouldn't lose that context.
                       */}
                      {activeGroup && (
                        <button
                          type="button"
                          onClick={() => setShowSignup(false)}
                          className="text-bone/55 hover:text-gold mb-5 inline-flex items-center gap-1.5 text-sm transition-colors"
                        >
                          <span aria-hidden>←</span>
                          {t("panel.title", { count: activeGroup.markers.length })}
                        </button>
                      )}
                      <p className="text-bone/65 text-sm leading-relaxed">
                        {ta("registerSubtitle")}
                      </p>
                      <div className="mt-6">
                        <AuthForm mode="register" action={registerAccount} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                      {activeGroup?.markers.map((marker) => {
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
                            <p className="text-bone/65 mt-1 text-sm leading-relaxed whitespace-pre-wrap">
                              {marker.body}
                            </p>
                          )}
                          {restricted && (
                            <>
                              <p className="text-bone/55 mt-2 text-sm leading-relaxed">
                                {isPro ? t("modal.bodyPro") : t("modal.body")}
                              </p>
                              {!isPro &&
                                (signedIn ? (
                                  <Link
                                    href="/pro"
                                    className="bg-gold text-ink hover:bg-gold-bright mt-3 inline-block rounded-full px-4 py-2 text-xs font-medium transition-colors"
                                  >
                                    {t("modal.upgrade")}
                                  </Link>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setShowSignup(true)}
                                    className="bg-gold text-ink hover:bg-gold-bright mt-3 inline-block cursor-pointer rounded-full px-4 py-2 text-xs font-medium transition-colors"
                                  >
                                    {t("modal.createAccount")}
                                  </button>
                                ))}
                            </>
                          )}

                          {/*
                           * A copy-link button, not a navigation link — the
                           * report page it points to has nothing this card
                           * doesn't already show (see its own comment on
                           * `MarkerReport`), so leaving the map to read it
                           * cost a page load for no new information. This
                           * still gets a visitor the same shareable URL.
                           */}
                          <div className="mt-3">
                            <CopyLinkButton
                              label={t("report.copyLink")}
                              copiedLabel={t("report.linkCopied")}
                              url={`${typeof window !== "undefined" ? window.location.origin : ""}/${locale}/intelligence/report/${marker.id}`}
                            />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
