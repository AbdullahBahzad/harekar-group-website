"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { CircularGallery, type GalleryItem } from "@/components/ui/circular-gallery";
import type { ResolvedService } from "@/lib/services";

/** Must match the `perspective` the gallery sets on its stage. */
const PERSPECTIVE = 2000;

/** Card width : height, preserving the original 300x400 proportion. */
const CARD_RATIO = 0.75;

/**
 * Horizontal travel, in pixels, that counts as a deliberate touch swipe.
 * Anything shorter is treated as a tap and leaves the ring where it was.
 */
const SWIPE_THRESHOLD = 45;

/**
 * Accumulated horizontal wheel delta needed to advance one card, and the
 * quiet period afterwards.
 *
 * A trackpad two-finger swipe arrives as a burst of dozens of `wheel` events
 * with momentum trailing behind it. Without a threshold and a cooldown a
 * single flick would race through the whole ring.
 */
const WHEEL_STEP_DELTA = 60;
const WHEEL_COOLDOWN_MS = 420;

/**
 * The services carousel: drag or swipe left/right to turn the ring, or use
 * the arrow buttons. This replaced a scroll-linked version that rotated the
 * cylinder as the page scrolled past a tall runway — that tied the animation
 * to vertical scroll for what is, in effect, a horizontal browsing gesture,
 * and gave touch users no way to move it except by scrolling the whole page.
 * A direct left/right drag matches the motion to the gesture.
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

  const anglePerItem = services.length > 0 ? 360 / services.length : 0;

  /*
   * The ring's position is an *index*, not a free angle.
   *
   * Rotation used to accumulate without limit, so the ring could wind on
   * forever and the same card sat at a different absolute angle each lap.
   * Deriving the angle from a clamped index instead gives the carousel one
   * fixed span — card 0 at 0°, the last card at `-(n-1) × anglePerItem` — and
   * every card always resolves to exactly the same degree.
   */
  const lastIndex = Math.max(0, services.length - 1);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);

  /*
   * The angle is derived, not animated in JS.
   *
   * This used to run a `requestAnimationFrame` tween that wrote to a motion
   * value sixty times a second, re-rendering all thirteen cards on every
   * frame. It was both wasteful and brittle — on a page this heavy the rAF
   * callbacks can be starved, and when they are the ring simply never moves.
   * Because the position is now a discrete index, a CSS transition on the
   * ring handles the travel entirely on the compositor: one declarative
   * target, no frame loop, no re-render storm, identical motion every time.
   */
  const rotation = -index * anglePerItem;

  /**
   * Moves to `next`, clamped to the ends of the ring. The single path by which
   * rotation ever changes, so it can only ever rest on a card face and always
   * travels with the same easing and duration.
   */
  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(lastIndex, next));
      if (clamped === indexRef.current) return;
      indexRef.current = clamped;
      setIndex(clamped);
    },
    [lastIndex],
  );

  const step = useCallback(
    (direction: 1 | -1) => goTo(indexRef.current + direction),
    [goTo],
  );

  /* ---- touch swipe ------------------------------------------------------ */

  const touchStartX = useRef(0);

  /*
   * Gated on `pointerType === "touch"`. Mouse drag is deliberately not a
   * gesture here: a click-and-drag on a ring of links fights the browser's own
   * text/image drag, and the arrows plus the trackpad already cover pointer
   * users. Fingers swipe; mice click and scroll.
   */
  function handlePointerDown(event: React.PointerEvent) {
    if (event.pointerType !== "touch") return;
    touchStartX.current = event.clientX;
  }

  function handlePointerUp(event: React.PointerEvent) {
    if (event.pointerType !== "touch") return;
    const delta = event.clientX - touchStartX.current;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    // Swiping left pulls the next card in, matching every native carousel.
    step(delta < 0 ? 1 : -1);
  }

  /* ---- trackpad two-finger swipe ---------------------------------------- */

  const stageRef = useRef<HTMLDivElement>(null);

  /*
   * A horizontal two-finger swipe on a trackpad arrives as `wheel` events
   * carrying `deltaX`. Bound natively rather than through `onWheel` because
   * React registers wheel listeners as passive, and a passive listener cannot
   * call `preventDefault()` — without which the browser would also treat the
   * gesture as a horizontal page scroll or a back-navigation.
   *
   * Vertical-dominant wheels are ignored and left to bubble, so scrolling the
   * page over the carousel still works normally.
   */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let accumulated = 0;
    let lockedUntil = 0;

    function onWheel(event: WheelEvent) {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;

      event.preventDefault();

      const now = performance.now();
      if (now < lockedUntil) return;

      accumulated += event.deltaX;
      if (Math.abs(accumulated) < WHEEL_STEP_DELTA) return;

      step(accumulated > 0 ? 1 : -1);
      accumulated = 0;
      // Swallows the momentum tail so one flick advances exactly one card.
      lockedUntil = now + WHEEL_COOLDOWN_MS;
    }

    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [step]);

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
          <div className="border-gold/35 bg-ink/85 relative max-h-[70svh] overflow-y-auto rounded-2xl border p-5 shadow-[0_24px_70px_-30px_rgba(197,156,64,0.7)] backdrop-blur-xl sm:p-7">
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label={tNav("close")}
              className="border-bone/20 text-bone/70 hover:border-gold hover:text-gold absolute end-3 top-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border transition-colors"
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
              <p className="text-gold/88 text-[10px] tracking-[0.3em] uppercase">
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

  /*
   * Prev/next arrows, shown in both the animated and reduced-motion trees.
   *
   * They carry the `disabled` attribute at the ends of the ring rather than
   * silently doing nothing — now that the carousel has a real first and last
   * card, a control that looks live but cannot move is a worse answer than
   * one that reads as spent.
   */
  const arrowClass =
    "border-bone/20 bg-ink/40 text-bone/70 hover:border-gold hover:text-gold pointer-events-auto flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border backdrop-blur-md transition-colors disabled:pointer-events-none disabled:opacity-30";

  const arrows = (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-between px-3 sm:px-6">
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={index === 0}
        aria-label={t("orbitPrev")}
        className={arrowClass}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 rtl:rotate-180" aria-hidden>
          <path
            d="M15 5l-7 7 7 7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={index === lastIndex}
        aria-label={t("orbitNext")}
        className={arrowClass}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 rtl:rotate-180" aria-hidden>
          <path
            d="M9 5l7 7-7 7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </button>
    </div>
  );

  // Reduced motion: a calm static ring driven by the arrows alone.
  if (reduceMotion) {
    return (
      <div className="relative h-[70vh] overflow-hidden">
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
        {arrows}
        {panel}
      </div>
    );
  }

  return (
    <div
      ref={stageRef}
      className="relative flex h-svh touch-pan-y items-center justify-center overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
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

      {arrows}

      {/* Drag affordance pinned to the stage's lower edge — steps aside for
          the detail panel, which occupies the same corner. */}
      <AnimatePresence>
        {!selected && (
          <motion.p
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-bone/60 pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 text-xs tracking-[0.3em] uppercase"
          >
            {t("orbitHint")}
          </motion.p>
        )}
      </AnimatePresence>

      {panel}
    </div>
  );
}

/**
 * A plain-JS spring-timed tween to `target`, keyed per motion value so a
 * second call (a quick second arrow press, or release-then-immediately-drag)
 * cancels the one in flight instead of the two fighting over the same value.
 *
 * `animate()` from framer-motion is the usual tool for this, but it targets
 * DOM-attached values or React-rendered `motion.*` components; driving a bare,
 * unattached `MotionValue` with it produced a controls object that never
 * actually advanced the value in the browser. A tick loop against `.set()` is
 * the same primitive `useSpring` already uses elsewhere in this file, just
 * run once to a target instead of continuously.
 */
