"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useTranslations } from "next-intl";
import type { ResolvedService } from "@/lib/services";
import { cn } from "@/lib/utils";

/**
 * Pointer travel, in pixels, before a press becomes a drag. Below it the press
 * is still a tap, so clicking a card keeps working.
 */
const DRAG_START_PX = 6;

/**
 * How far ahead, in milliseconds, the speed of release is projected to decide
 * where the row comes to rest. A slow drag settles on the nearest card; a quick
 * flick carries on a card or two, as a native carousel does.
 */
const INERTIA_MS = 140;

/** The furthest one fling may carry the row, in cards. */
const MAX_FLING_CARDS = 3;

/**
 * Accumulated horizontal wheel delta needed to advance one card, and the quiet
 * period afterwards. A trackpad swipe arrives as dozens of `wheel` events with
 * momentum trailing behind it; without a threshold and a cooldown one flick
 * would race through the whole row.
 */
const WHEEL_STEP_DELTA = 60;
const WHEEL_COOLDOWN_MS = 420;

/**
 * The shortest signed distance, in cards, from the centre to card `i` round a
 * loop of `n`. Always in (-n/2, n/2], so a card that has slid off one end
 * re-enters from the other rather than travelling back across the whole row.
 */
const wrap = (value: number, n: number) => {
  const m = ((value % n) + n) % n;
  return m > n / 2 ? m - n : m;
};

/**
 * The services slider: a row of tall rounded photo cards, the centre one
 * largest, the ones beside it stepping down in size and turning slightly toward
 * the middle. Drag left or right with a finger or the mouse, use the arrows,
 * the keyboard or a trackpad swipe; tap the middle card to read about it, or
 * tap a side card to bring it to the middle.
 *
 * The row never ends. Its position is one continuous number, and every card
 * finds its place from that number modulo the count, so turning past the last
 * service brings the first round again from the other side.
 *
 * The position is a spring-driven `MotionValue`, and every card derives its
 * transform from it, so a drag or a glide moves the cards without React
 * re-rendering anything per frame. Every card comes from the services the
 * server resolved: the admin console is what fills this row.
 */
export default function ServicesSlider({
  services,
}: {
  services: ResolvedService[];
}) {
  const t = useTranslations("services");
  const tNav = useTranslations("nav");
  const reduceMotion = useReducedMotion();
  const count = services.length;

  /*
   * Card size follows the viewport: big enough to read on a wide screen, and on
   * a phone narrow enough that the neighbours peek in from both sides, which is
   * what tells a visitor the row can be moved.
   */
  const [size, setSize] = useState({ w: 270, h: 356, gap: 260 });
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const w =
        vw < 640 ? Math.round(Math.min(250, vw * 0.62)) : vw < 1024 ? 240 : 270;
      setSize({ w, h: Math.round(w * 1.32), gap: Math.round(w * 0.96) });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  /*
   * `target` is where the row is heading; `position` is where it is, chasing the
   * target with a spring. Setting the target glides; setting both at once (see
   * `dragTo`) moves the row with no lag, which a drag needs.
   */
  const target = useMotionValue(0);
  const position = useSpring(target, {
    stiffness: 150,
    damping: 26,
    mass: 1,
    restDelta: 0.001,
  });

  const moveTo = useCallback(
    (value: number) => {
      target.set(value);
      if (reduceMotion) position.jump(value);
    },
    [target, position, reduceMotion],
  );

  /** One card round, either way. Never clamped: the row loops. */
  const step = useCallback(
    (direction: 1 | -1) => moveTo(Math.round(target.get()) + direction),
    [moveTo, target],
  );

  /* ---- drag: touch and mouse -------------------------------------------- */

  const stageRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const drag = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    startPosition: 0,
    samples: [] as { x: number; t: number }[],
  });
  const swallowClick = useRef(false);

  function handlePointerDown(event: React.PointerEvent) {
    // Primary button only: a right-click must not begin a drag.
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      // From where the row visibly is, so grabbing it mid-glide does not jump.
      startPosition: position.get(),
      samples: [{ x: event.clientX, t: performance.now() }],
    };
  }

  function handlePointerMove(event: React.PointerEvent) {
    const d = drag.current;
    if (!d.active || event.pointerId !== d.pointerId) return;

    const dx = event.clientX - d.startX;

    if (!d.moved) {
      if (Math.abs(dx) < DRAG_START_PX) return;
      d.moved = true;
      /*
       * The pointer is taken only now, not at the press: capturing it straight
       * away would redirect the click a plain tap on a card is meant to
       * deliver. Once it is a drag, capture keeps the row following the pointer
       * even when it strays off the stage.
       */
      stageRef.current?.setPointerCapture(event.pointerId);
      setDragging(true);
    }

    d.samples.push({ x: event.clientX, t: performance.now() });
    if (d.samples.length > 6) d.samples.shift();

    /*
     * One card of travel per card-spacing of pointer travel, so the card under
     * the finger stays under it. Dragging left (a negative `dx`) brings the next
     * card round.
     */
    const next = d.startPosition - dx / size.gap;
    target.set(next);
    position.jump(next);
  }

  function endDrag(event: React.PointerEvent) {
    const d = drag.current;
    if (!d.active || event.pointerId !== d.pointerId) return;
    d.active = false;

    // A press that never travelled was a tap; the card's own click handles it.
    if (!d.moved) return;

    try {
      stageRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      // Already released, e.g. on a cancelled touch: nothing to undo.
    }

    // Speed at release, from the last few samples. A pointer that has stopped
    // before letting go should not fling, however fast it moved earlier.
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const stopped = performance.now() - last.t > 90;
    const velocity = stopped
      ? 0
      : (last.x - first.x) / Math.max(1, last.t - first.t);

    const here = position.get();
    const projected = here - (velocity * INERTIA_MS) / size.gap;
    const home = Math.round(here);
    const rest = Math.max(
      home - MAX_FLING_CARDS,
      Math.min(home + MAX_FLING_CARDS, Math.round(projected)),
    );

    // Whatever click this release would deliver to a card is not a real click.
    swallowClick.current = true;
    setTimeout(() => {
      swallowClick.current = false;
    }, 0);

    setDragging(false);
    moveTo(rest);
  }

  /* ---- trackpad two-finger swipe, and the keyboard ---------------------- */

  /*
   * Bound natively rather than through `onWheel`: React registers wheel
   * listeners as passive, and a passive listener cannot call `preventDefault()`
   * to stop the browser treating the gesture as a horizontal page scroll or a
   * back-navigation. Vertical-dominant wheels are ignored and left to bubble, so
   * scrolling the page over the slider still works.
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

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") step(1);
    else if (event.key === "ArrowLeft") step(-1);
  }

  /* ---- the open card ----------------------------------------------------- */

  /*
   * Opening a card shows its detail in a panel docked over the slider, so the
   * row stays visible behind it and picking another service swaps the copy in
   * place instead of forcing a close-then-reopen.
   */
  const [selected, setSelected] = useState<string | null>(null);
  const detail = services.find((service) => service.slug === selected) ?? null;

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  /**
   * The middle card opens its details; any other card is brought to the middle
   * first, by the shortest way round.
   */
  function handleSelect(index: number, slug: string) {
    const offset = wrap(index - position.get(), count);
    if (Math.abs(offset) < 0.5) {
      setSelected((current) => (current === slug ? null : slug));
      return;
    }
    moveTo(Math.round(position.get() + offset));
  }

  if (count === 0) return null;

  const ease = [0.22, 1, 0.36, 1] as const;

  const arrowClass =
    "border-bone/20 bg-ink/50 text-bone/75 hover:border-gold hover:text-gold pointer-events-auto absolute top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border backdrop-blur-md transition-colors";

  return (
    <div className="relative">
      <div
        ref={stageRef}
        className={cn(
          "relative touch-pan-y overflow-hidden select-none",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
        style={{ height: size.h + 72, perspective: "1400px" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleKeyDown}
        onClickCapture={(event) => {
          if (!swallowClick.current) return;
          event.stopPropagation();
          event.preventDefault();
        }}
      >
        {services.map((service, index) => (
          <SliderCard
            key={service.id}
            service={service}
            index={index}
            count={count}
            position={position}
            size={size}
            group={t(`groups.${service.group}`)}
            selectLabel={t("orbitSelect")}
            selected={selected === service.slug}
            onSelect={() => handleSelect(index, service.slug)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => step(-1)}
        aria-label={t("orbitPrev")}
        className={cn(arrowClass, "start-1 sm:start-4")}
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
        aria-label={t("orbitNext")}
        className={cn(arrowClass, "end-1 sm:end-4")}
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

      {/* The drag affordance steps aside for the panel, which sits in the
          same corner. */}
      <AnimatePresence>
        {!selected && (
          <motion.p
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-bone/55 pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-xs tracking-[0.3em] uppercase"
          >
            {t("orbitHint")}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selected && detail && (
          <motion.div
            key="panel"
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: reduceMotion ? 0 : 0.35, ease }}
            className="pointer-events-auto absolute inset-x-4 bottom-4 z-40 mx-auto max-w-xl sm:inset-x-6"
          >
            {/* Capped and scrollable so a short stage cannot be swallowed
                whole by the panel. */}
            <div className="border-gold/35 bg-ink/90 relative max-h-[60svh] overflow-y-auto rounded-2xl border p-5 shadow-[0_24px_70px_-30px_rgba(197,156,64,0.7)] backdrop-blur-xl sm:p-7">
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

              {/* Only the copy is keyed to the selection, so switching services
                  replays its entrance without the shell blinking empty. */}
              <motion.div
                key={selected}
                role="region"
                aria-live="polite"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.28, ease: "easeOut" }}
              >
                <p className="text-gold/90 text-[10px] tracking-[0.3em] uppercase">
                  {t(`groups.${detail.group}`)}
                </p>
                <h3 className="font-display text-bone mt-3 pe-10 text-2xl leading-snug font-medium">
                  {detail.title}
                </h3>
                <p className="text-bone/70 mt-3 text-sm leading-relaxed text-pretty">
                  {detail.description}
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * One card. Its whole placement is derived from the row's position, so it moves
 * with a drag or a glide without a single React render.
 */
function SliderCard({
  service,
  index,
  count,
  position,
  size,
  group,
  selectLabel,
  selected,
  onSelect,
}: {
  service: ResolvedService;
  index: number;
  count: number;
  position: MotionValue<number>;
  size: { w: number; h: number; gap: number };
  group: string;
  selectLabel: string;
  selected: boolean;
  onSelect: () => void;
}) {
  // Signed distance from the middle, in cards: 0 is centred, +-1 its neighbours.
  const offset = useTransform(position, (p) => wrap(index - p, count));

  const x = useTransform(offset, (d) => d * size.gap);
  // Steps down to 0.7 by three cards out, so the middle card leads.
  const scale = useTransform(offset, (d) => 1 - 0.1 * Math.min(Math.abs(d), 3));
  // Turns the outer cards toward the middle: positive on the left, negative on
  // the right, capped so the far ones never go edge-on.
  const rotateY = useTransform(offset, (d) =>
    Math.max(-42, Math.min(42, -d * 20)),
  );
  // Fades with distance, and to nothing just past the edge, so the card that
  // wraps from one end to the other does so unseen.
  const opacity = useTransform(offset, (d) => {
    const a = Math.abs(d);
    return Math.max(0, 1 - 0.14 * a) * Math.max(0, Math.min(1, 4.6 - a));
  });
  const zIndex = useTransform(offset, (d) => 100 - Math.round(Math.abs(d) * 10));
  const pointerEvents = useTransform(opacity, (o) => (o < 0.08 ? "none" : "auto"));

  return (
    <motion.div
      data-slide
      className="absolute"
      style={{
        width: size.w,
        height: size.h,
        left: "50%",
        top: 36,
        marginLeft: -size.w / 2,
        x,
        scale,
        rotateY,
        opacity,
        zIndex,
        pointerEvents,
        willChange: "transform, opacity",
      }}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`${service.title} — ${selectLabel}`}
        className={cn(
          "group focus-visible:ring-gold hover:border-gold/60 absolute inset-0 cursor-pointer overflow-hidden rounded-3xl border text-start shadow-2xl outline-none focus-visible:ring-2",
          selected ? "border-gold/70" : "border-bone/14",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 3D-transformed card; next/image adds no value here */}
        <img
          src={service.imageUrl}
          alt=""
          loading="lazy"
          // A photo is draggable by default, and the browser's own image drag
          // would take over from ours on a mouse drag.
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
        />

        {/* Gold lift on hover and while open. */}
        <span
          aria-hidden
          className={cn(
            "from-gold/25 pointer-events-none absolute inset-0 bg-gradient-to-t to-transparent transition-opacity duration-300",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        />

        {/* Darkens toward the labels so they read on any photograph. */}
        <div className="pointer-events-none absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-12 text-left rtl:text-right">
          <h3 className="font-display text-bone text-lg leading-snug font-medium">
            {service.title}
          </h3>
          <em className="text-gold-bright/80 mt-1 block text-xs italic">
            {group}
          </em>
        </div>

        {/* Hairline gold top edge. */}
        <div className="via-gold/40 pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent" />
      </button>
    </motion.div>
  );
}
