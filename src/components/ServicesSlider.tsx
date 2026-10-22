"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ResolvedService } from "@/lib/services";
import ServiceGallery from "@/components/ServiceGallery";
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
 * A trackpad swipe arrives as a stream of `wheel` events, with the operating
 * system's own momentum trailing behind it. The row follows that stream
 * directly, exactly as it follows a finger, and once the stream has been quiet
 * for this long the swipe is over and the row settles on the nearest card.
 */
const WHEEL_IDLE_MS = 130;

/** Pixels of trackpad travel per card, a little less than a card's width. */
const WHEEL_PX_PER_CARD_SCALE = 0.85;

/** The furthest one swipe may carry the row, in cards. */
const MAX_WHEEL_CARDS = 3;

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
 * How strongly each card holds the row while it is being dragged. 0 is a free
 * row; it must stay under 1 or the pull would turn the row back on itself.
 */
const MAGNET = 0.55;

/**
 * The magnetic drag curve. A drag position `x` (in cards) is shown at
 * `x - MAGNET * sin(2 PI x) / (2 PI)`. That leaves every whole number exactly
 * where it was, but slows the row to about 45% speed as it passes through one
 * (it feels held by the card) and speeds it to about 155% between two (it is
 * let go, and rushes to the next). The result is a drag that catches on each
 * card like a magnet, rather than sliding past all of them at one flat speed.
 */
const detent = (x: number) => x - (MAGNET * Math.sin(2 * Math.PI * x)) / (2 * Math.PI);

/** Where the finger must be for the row to be shown at `y`: the curve backwards. */
const undetent = (y: number) => {
  let x = y;
  // The curve is monotonic, so Newton's method settles in a few steps.
  for (let i = 0; i < 6; i++) {
    x -= (detent(x) - y) / (1 - MAGNET * Math.cos(2 * Math.PI * x));
  }
  return x;
};

/**
 * The services slider: a row of tall rounded photo cards, the centre one
 * largest, the ones beside it stepping down in size and turning slightly toward
 * the middle. Drag left or right with a finger or the mouse, use the arrows,
 * the keyboard or a trackpad swipe. Selecting a card brings it to the middle
 * and opens its details beneath the row — description and a photo gallery —
 * which then follow the arrows from service to service.
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
   * Every photo is fetched and decoded as soon as the row mounts, so no card
   * has to be decoded for the first time while it is sliding into view.
   */
  useEffect(() => {
    for (const service of services) {
      const image = new Image();
      image.src = service.imageUrl;
      image.decode?.().catch(() => {
        // A photo that fails to decode still shows normally; nothing to do.
      });
    }
  }, [services]);

  /*
   * `target` is where the row is heading; `position` is where it is, chasing the
   * target with a spring. Setting the target glides; setting both at once (see
   * `dragTo`) moves the row with no lag, which a drag needs.
   */
  const target = useMotionValue(0);
  /*
   * A little under critically damped, on purpose: the row eases in fast, then
   * settles onto the card with a small overshoot — the snap of a magnet taking
   * hold — instead of creeping to a dead stop.
   */
  const position = useSpring(target, {
    stiffness: 190,
    damping: 22,
    mass: 1,
    restDelta: 0.0005,
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
    // Where the finger has taken the row, before the magnet bends it, in cards.
    startRaw: 0,
    raw: 0,
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
      startRaw: undetent(position.get()),
      raw: undetent(position.get()),
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
     * One card of travel per card-spacing of pointer travel, bent through the
     * magnet so the row lingers on each card and hurries between them. Dragging
     * left (a negative `dx`) brings the next card round.
     */
    d.raw = d.startRaw - dx / size.gap;
    const shown = detent(d.raw);
    target.set(shown);
    position.jump(shown);
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

    // Judged on where the finger took it, not where the magnet showed it.
    const here = d.raw;
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
   *
   * A swipe moves the row continuously and through the same magnet as a drag,
   * rather than triggering one fixed step: a step-per-swipe felt like a switch
   * being flipped, not a surface being pushed.
   */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let raw = 0;
    let startRaw = 0;
    let active = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function settle() {
      active = false;
      moveTo(Math.round(raw));
    }

    function onWheel(event: WheelEvent) {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;

      event.preventDefault();

      if (!active) {
        active = true;
        // From where the row visibly is, so a swipe made mid-glide does not jump.
        raw = undetent(position.get());
        startRaw = raw;
      }

      raw += event.deltaX / (size.gap * WHEEL_PX_PER_CARD_SCALE);
      raw = Math.max(
        startRaw - MAX_WHEEL_CARDS,
        Math.min(startRaw + MAX_WHEEL_CARDS, raw),
      );

      const shown = detent(raw);
      target.set(shown);
      position.jump(shown);

      clearTimeout(timer);
      timer = setTimeout(settle, WHEEL_IDLE_MS);
    }

    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      stage.removeEventListener("wheel", onWheel);
      clearTimeout(timer);
    };
  }, [size.gap, moveTo, position, target]);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") step(1);
    else if (event.key === "ArrowLeft") step(-1);
  }

  /* ---- the open service ------------------------------------------------ */

  /** The card in the middle, as an index into `services`. */
  const [centre, setCentre] = useState(0);
  useMotionValueEvent(target, "change", (value) => {
    const next = ((Math.round(value) % count) + count) % count;
    setCentre((current) => (current === next ? current : next));
  });

  /*
   * The details show whichever service is in the middle, so once open they
   * follow the arrows, a drag or a swipe from one service to the next.
   */
  const [open, setOpen] = useState(false);
  const detail = open ? services[centre] : null;
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /** Brings the card to the middle by the shortest way round, and opens it. */
  const select = useCallback(
    (index: number) => {
      const offset = wrap(index - position.get(), count);
      if (Math.abs(offset) < 0.5 && open) {
        setOpen(false);
        return;
      }
      moveTo(Math.round(position.get() + offset));
      setOpen(true);
    },
    [count, moveTo, open, position],
  );

  // Opening brings the details up, unless they are already in full view.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const panel = detailRef.current;
      if (!panel || panel.getBoundingClientRect().bottom <= window.innerHeight) return;
      panel.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }, 500);
    return () => clearTimeout(timer);
  }, [open, reduceMotion]);

  /*
   * `#service-<slug>` — as the home page's service cards link — opens that
   * service straight away.
   */
  useEffect(() => {
    function openFromHash() {
      const match = window.location.hash.match(/^#service-(.+)$/);
      if (!match) return;
      const index = services.findIndex((service) => service.slug === decodeURIComponent(match[1]));
      if (index < 0) return;
      target.set(index);
      position.jump(index);
      setOpen(true);
    }
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [services, target, position]);

  if (count === 0) return null;

  const ease = [0.22, 1, 0.36, 1] as const;

  const arrowClass =
    "tone-navy bg-ink text-bone hover:bg-gold hover:text-ink focus-visible:ring-gold pointer-events-auto flex size-12 cursor-pointer items-center justify-center rounded-full shadow-[0_12px_30px_-12px_rgba(0,0,0,0.6)] outline-none transition-colors focus-visible:ring-2 sm:size-14";

  return (
    <div className="relative">
      <div
        ref={stageRef}
        className={cn(
          "relative touch-pan-y overflow-hidden select-none",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
        style={{ height: size.h + 56, perspective: "1400px" }}
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
            selected={open && centre === index}
            onSelect={() => select(index)}
          />
        ))}
      </div>

      {/* Side arrows, over the row's edges. */}
      <div
        className="pointer-events-none absolute inset-x-2 z-30 flex -translate-y-1/2 justify-between sm:inset-x-6"
        // Centred on the row itself, whatever opens beneath it.
        style={{ top: (size.h + 56) / 2 }}
      >
        <ArrowButton direction="prev" label={t("orbitPrev")} className={arrowClass} onClick={() => step(-1)} />
        <ArrowButton direction="next" label={t("orbitNext")} className={arrowClass} onClick={() => step(1)} />
      </div>

      {/* Which service is in the middle, out of how many. */}
      <div className="mt-2 flex flex-col items-center gap-2 px-4 text-center">
        <p className="text-bone text-sm font-bold tabular-nums" dir="ltr">
          {String(centre + 1).padStart(2, "0")}
          <span className="text-bone/40"> / {String(count).padStart(2, "0")}</span>
        </p>
        <p className="text-bone/55 text-xs tracking-[0.2em] uppercase">{t("orbitHint")}</p>
      </div>

      {/* The open service: description beside a gallery of its photos. */}
      <AnimatePresence initial={false}>
        {detail && (
          <motion.div
            key="detail"
            ref={detailRef}
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.45, ease }}
            className="scroll-mt-28 overflow-hidden"
          >
            <div className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
              <div className="border-bone/12 bg-surface relative grid gap-8 rounded-3xl border p-5 pt-16 sm:p-8 sm:pt-16 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-12 lg:p-10">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={tNav("close")}
                  className="border-bone/20 text-bone/70 hover:border-gold hover:text-gold-deep absolute end-3 top-3 z-10 flex size-11 cursor-pointer items-center justify-center rounded-full border bg-white transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>

                <ServiceGallery
                  key={`gallery-${detail.id}`}
                  images={detail.gallery}
                  title={detail.title}
                />

                {/* Keyed so moving to another service replays the copy's entrance. */}
                <motion.div
                  key={`copy-${detail.id}`}
                  role="region"
                  aria-live="polite"
                  aria-label={detail.title}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.35, ease }}
                  className="flex flex-col justify-center lg:pe-6"
                >
                  <p className="text-gold-deep text-sm font-bold">{t(`groups.${detail.group}`)}</p>
                  <h3 className="font-display text-bone mt-2 pe-12 text-2xl leading-snug font-bold sm:text-3xl">
                    {detail.title}
                  </h3>
                  <p className="text-bone/75 mt-4 text-base leading-relaxed text-pretty">
                    {detail.description}
                  </p>
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Link
                      href="/contact"
                      className="bg-gold text-ink hover:bg-gold-bright inline-flex min-h-12 items-center rounded-full px-6 text-sm font-bold transition-colors"
                    >
                      {t("detailCta")}
                    </Link>
                    <div className="ms-auto flex gap-2">
                      <ArrowButton direction="prev" label={t("orbitPrev")} className={cn(arrowClass, "size-11 sm:size-11")} onClick={() => step(-1)} />
                      <ArrowButton direction="next" label={t("orbitNext")} className={cn(arrowClass, "size-11 sm:size-11")} onClick={() => step(1)} />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A round arrow button; the glyph mirrors itself in right-to-left pages. */
function ArrowButton({
  direction,
  label,
  className,
  onClick,
}: {
  direction: "prev" | "next";
  label: string;
  className: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={className}>
      <svg viewBox="0 0 24 24" className="size-5 rtl:rotate-180" aria-hidden>
        <path
          d={direction === "prev" ? "M19 12H5M11 6l-6 6 6 6" : "M5 12h14M13 6l6 6-6 6"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </button>
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
          "tone-navy group focus-visible:ring-gold hover:border-gold/60 absolute inset-0 cursor-pointer overflow-hidden rounded-3xl border text-start shadow-[0_24px_50px_-24px_rgba(22,22,22,0.55)] outline-none focus-visible:ring-2",
          selected ? "border-gold/70" : "border-bone/14",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 3D-transformed card; next/image adds no value here */}
        <img
          src={service.imageUrl}
          alt=""
          // Loaded up front and decoded off the main thread. Lazy loading meant a
          // card arriving from off-screen could pop its photo in mid-slide.
          loading="eager"
          decoding="async"
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
        <div className="pointer-events-none absolute bottom-0 left-0 w-full bg-gradient-to-t from-[rgba(22,22,22,0.92)] via-[rgba(22,22,22,0.5)] to-transparent p-4 pt-12 text-left rtl:text-right">
          <h3 className="font-display text-bone text-lg leading-snug font-bold">
            {service.title}
          </h3>
          <em className="text-gold-deep/80 mt-1 block text-xs italic">
            {group}
          </em>
        </div>

        {/* Hairline gold top edge. */}
        <div className="via-gold/40 pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent" />
      </button>
    </motion.div>
  );
}
