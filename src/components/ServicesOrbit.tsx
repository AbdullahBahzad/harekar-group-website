"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useTranslations } from "next-intl";
import { CircularGallery, type GalleryItem } from "@/components/ui/circular-gallery";
import type { ResolvedService } from "@/lib/services";

/**
 * Full-turn count across the orbit's scroll runway. One turn shows every
 * service exactly once without feeling like a spinning top.
 */
const TURNS = 1;

/** Must match the `perspective` the gallery sets on its stage. */
const PERSPECTIVE = 2000;

/** Card width : height, preserving the original 300x400 proportion. */
const CARD_RATIO = 0.75;

/**
 * The services carousel: a sticky stage inside a tall runway, so scrolling
 * through this stretch of the page rotates the cylinder of service cards.
 * Scroll down advances the orbit, scroll up reverses it — the same
 * scrub-the-cinema rule as the hero and the map.
 *
 * Every card — its title, copy, grouping and photograph — comes from the
 * services the server resolved, so the admin console is what fills this ring.
 * Nothing about a service is hardcoded here.
 */
export default function ServicesOrbit({
  services,
}: {
  services: ResolvedService[];
}) {
  const t = useTranslations("services");
  const tNav = useTranslations("nav");
  const reduceMotion = useReducedMotion();
  const runwayRef = useRef<HTMLDivElement>(null);
  const [radius, setRadius] = useState(600);
  const [card, setCard] = useState({ w: 300, h: 400 });

  /*
   * Radius adapts to viewport width so the ring never overwhelms small screens,
   * and the card is then sized to the viewport *height*.
   *
   * The height half matters because the stage is one viewport tall while the
   * card was a fixed 400px: in phone landscape the front card projected to over
   * 500px inside a 360px stage and its title was clipped clean off. The front
   * card sits closest to the camera, so perspective magnifies it by
   * `p / (p - radius)`; dividing the available height by that factor gives the
   * largest layout height whose *rendered* result still fits. Tall viewports
   * clamp back to the original 340/400, so portrait and desktop are unchanged.
   */
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const r = w < 640 ? Math.max(300, w * 0.78) : w < 1024 ? 480 : 600;
      setRadius(r);

      const magnify = PERSPECTIVE / (PERSPECTIVE - r);
      const cap = w < 640 ? 340 : 400;
      const cardH = Math.round(
        Math.max(190, Math.min(cap, (h * 0.86) / magnify)),
      );
      setCard({ w: Math.round(cardH * CARD_RATIO), h: cardH });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: runwayRef,
    offset: ["start start", "end end"],
  });

  // Springed so wheel steps glide instead of snapping card to card.
  const turn = useSpring(useTransform(scrollYProgress, [0, 1], [0, -360 * TURNS]), {
    stiffness: 60,
    damping: 20,
  });
  const [rotation, setRotation] = useState(0);
  useEffect(() => turn.on("change", (v) => setRotation(v)), [turn]);

  // Stage fades in as the orbit arrives, out as it leaves.
  const stageFade = useTransform(
    scrollYProgress,
    [0, 0.08, 0.92, 1],
    [0.3, 1, 1, 0.3],
  );

  /*
   * Built from the services the server resolved, so whatever the console
   * publishes is what turns on the ring.
   */
  const items: GalleryItem[] = services.map((service) => ({
    id: service.slug,
    common: service.title,
    binomial: t(`groups.${service.group}`),
    photo: {
      url: service.imageUrl,
      text: service.title,
      by: "Harekar Group",
    },
  }));

  /*
   * Selecting a card opens its detail on the stage itself. The panel is docked
   * rather than a modal so the ring stays visible and clickable behind it —
   * picking another service swaps the copy in place instead of forcing a
   * close-then-reopen.
   */
  const [selected, setSelected] = useState<string | null>(null);

  /** The full record behind the open card, for the docked detail panel. */
  const detail = services.find((service) => service.slug === selected) ?? null;

  const handleSelect = useCallback((item: GalleryItem) => {
    const id = item.id;
    if (!id) return;
    setSelected((prev) => (prev === id ? null : id));
  }, []);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  /*
   * The shell is keyed to a constant so it stays mounted for the whole time a
   * service is open, and only the copy inside is keyed to the selection.
   * Keying the shell itself would make switching services an exit-then-enter:
   * `mode="wait"` holds the incoming panel until the outgoing one has finished
   * leaving, which reads as the panel blinking empty between services.
   * Remounting just the content replays its entrance with no gap.
   */
  const panel = (
    <AnimatePresence>
      {selected && detail && (
        <motion.div
          key="panel"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto absolute inset-x-4 bottom-6 z-20 mx-auto max-w-xl sm:inset-x-6"
        >
          {/* Capped and scrollable so a short landscape stage cannot be
              swallowed whole by the panel. */}
          <div className="border-gold/25 bg-ink/85 relative max-h-[70svh] overflow-y-auto rounded-2xl border p-5 shadow-[0_24px_70px_-30px_rgba(197,156,64,0.7)] backdrop-blur-xl sm:p-7">
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label={tNav("close")}
              className="border-bone/15 text-bone/60 hover:border-gold hover:text-gold absolute end-3 top-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <motion.div
              key={selected}
              role="region"
              aria-live="polite"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.28, ease: "easeOut" }}
            >
              <p className="text-gold/80 text-[10px] tracking-[0.3em] uppercase">
                {t(`groups.${detail?.group ?? "all"}`)}
              </p>
              <h3 className="font-display text-bone mt-3 pe-10 text-2xl leading-snug font-medium">
                {detail?.title}
              </h3>
              <p className="text-bone/70 mt-3 text-sm leading-relaxed text-pretty">
                {detail?.description}
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Reduced motion: a calm static ring, no scroll runway.
  if (reduceMotion) {
    return (
      <div className="relative h-[70vh] overflow-hidden">
        <CircularGallery
          items={items}
          radius={radius}
          rotation={0}
          selectedId={selected}
          onSelect={handleSelect}
          selectLabel={t("orbitSelect")}
          cardWidth={card.w}
          cardHeight={card.h}
        />
        {panel}
      </div>
    );
  }

  return (
    <div ref={runwayRef} className="relative h-[300vh]">
      <motion.div
        className="sticky top-0 flex h-svh items-center justify-center overflow-hidden"
        style={{ opacity: stageFade }}
      >
        <CircularGallery
          items={items}
          radius={radius}
          rotation={rotation}
          selectedId={selected}
          onSelect={handleSelect}
          selectLabel={t("orbitSelect")}
          cardWidth={card.w}
          cardHeight={card.h}
        />

        {/* Scroll affordance pinned to the stage's lower edge — it steps aside
            for the detail panel, which occupies the same corner. */}
        <AnimatePresence>
          {!selected && (
            <motion.p
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-bone/35 pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 text-xs tracking-[0.3em] uppercase"
            >
              {t("orbitHint")}
            </motion.p>
          )}
        </AnimatePresence>

        {panel}
      </motion.div>
    </div>
  );
}
