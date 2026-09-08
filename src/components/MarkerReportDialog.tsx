"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { IntelMarker } from "@/data/iraq";

/**
 * The assessment a flagged location opens.
 *
 * Shared by both map renderings — the Google one and the drawn fallback — so
 * the gating story is told in exactly one place. Whether the reader may see
 * the written assessment was already decided on the server: an unentitled
 * reader's marker arrives with no `body` at all, and this component only picks
 * the words to put in its absence.
 */
export default function MarkerReportDialog({
  marker,
  onClose,
}: {
  marker: IntelMarker | null;
  onClose: () => void;
}) {
  const t = useTranslations("intelligence");
  /*
   * Entitlement is read from the session for *presentation only*. The payload
   * itself is the gate — see `getPublishedMarkers`.
   */
  const { data: session } = useSession();
  const signedIn = Boolean(session?.user);
  const isPro = Boolean(session?.user?.isPro);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!marker) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [marker, onClose]);

  return (
    <AnimatePresence>
      {marker && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label={t("modal.close")}
            onClick={onClose}
            className="bg-ink/80 absolute inset-0 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
            initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }
            }
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="border-gold/40 bg-surface/95 relative w-full max-w-md rounded-2xl border p-8 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.9)]"
          >
            <span className="border-gold/50 text-gold inline-block rounded-full border px-3 py-1 text-[10px] tracking-[0.25em] uppercase">
              {isPro ? t("modal.badgePro") : t("modal.badge")}
            </span>

            <h2
              id="report-title"
              className="font-display text-bone mt-5 text-2xl leading-snug"
            >
              {marker.body
                ? (marker.headline ?? marker.label)
                : isPro
                  ? t("modal.titlePro", { city: marker.label })
                  : t("modal.title")}
            </h2>
            <p className="text-bone/70 mt-4 text-sm leading-relaxed whitespace-pre-wrap">
              {marker.body
                ? marker.body
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
                onClick={onClose}
                className="border-bone/26 text-bone/70 hover:text-bone rounded-full border px-6 py-2.5 text-sm transition-colors"
              >
                {isPro ? t("modal.close") : t("modal.dismiss")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
