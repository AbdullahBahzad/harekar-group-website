"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LaurelWreath from "@/components/LaurelWreath";
import SensorSweep from "@/components/ui/sensor-sweep";
import type { LionVideoMode } from "@/components/HeroLionVideo";

// Client-only: the looping Higgsfield roar footage.
const HeroLionVideo = dynamic(() => import("@/components/HeroLionVideo"), {
  ssr: false,
});

/**
 * Swap this to change the hero lion still. It stands in until the video is
 * ready, and is the permanent visual wherever the video cannot play. Must sit
 * on a transparent background so it composes over the ring.
 */
const LION_SRC = "/lion-hero.webp";

/** Maximum cursor tilt in degrees — small enough that the lion feels heavy. */
const MAX_TILT = 10;

/**
 * Punches the lion transparent under the pointer, so the scanned wireframe
 * surfaces through the gap. Inverse of the lens SensorSweep draws into, driven
 * by the same stage variables — the lion gives way exactly where the scan
 * appears.
 *
 * At `--hole-r: 0px` the gradient collapses and every pixel falls past the
 * final stop, leaving the lion fully opaque. Nothing to undo when idle.
 */
const LION_HOLE =
  "radial-gradient(circle var(--hole-r, 0px) at var(--mx, -999px) var(--my, -999px), transparent 40%, rgba(0,0,0,0.45) 72%, #000 100%)";

/**
 * The opening scene: the lion roaring on a continuous loop inside a gold LED
 * laurel wreath.
 *
 * Scroll drives exactly one thing — the wreath closing over the lion, and
 * opening again on the way back up. The roar loop and the pointer dissolve are
 * deliberately independent of it: the clip plays at its own pace and the dots
 * answer only to the cursor, so neither stutters when the page moves.
 */
export default function HeroCinematic() {
  const t = useTranslations("hero");
  const tCta = useTranslations("cta");
  const reduceMotion = useReducedMotion();
  const [finePointer, setFinePointer] = useState(false);
  const [useVideo, setUseVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoMode, setVideoMode] = useState<LionVideoMode>("alpha");

  // Handed to the sensor sweep so it can sample the lion's own frames.
  const lionVideo = useRef<HTMLVideoElement | null>(null);

  /* ---- the wreath closing ----------------------------------------------- */

  const stage = useRef<HTMLElement | null>(null);

  /*
   * Measured from the hero's own top edge to the moment it has fully left, so
   * the wreath answers to how far *this section* has travelled rather than to
   * the length of the page below it.
   */
  const { scrollYProgress } = useScroll({
    target: stage,
    offset: ["start start", "end start"],
  });

  /*
   * The lion recedes as the branches sweep over him — closing leaves alone
   * would leave slivers of fur showing between them, which reads as a gap
   * rather than as concealment. He is gone slightly before they finish, so
   * the wreath seals on an empty centre.
   */
  const lionVeil = useTransform(scrollYProgress, [0, 0.34], [1, 0]);
  const lionRecede = useTransform(scrollYProgress, [0, 0.34], [1, 0.9]);

  // Cursor-follow only exists where a fine pointer does.
  useEffect(() => {
    const query = window.matchMedia("(pointer: fine)");
    const onChange = () => setFinePointer(query.matches);
    // Deferred so the initial detection never sets state mid-effect.
    queueMicrotask(onChange);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  /*
   * The roar runs everywhere.
   *
   * It used to be gated behind `min-width: 1024px`, which meant every phone got
   * the still — the lion simply did not move for most of the people who visit.
   * The gate was standing in for a bandwidth decision it could not actually
   * make: screen width says nothing about the connection, and the H.264 variant
   * a phone receives is 0.7MB against the desktop WebM's 2.8MB.
   *
   * Data Saver is the signal that genuinely means "do not spend my bandwidth",
   * so that is what is honoured instead, alongside reduced motion.
   */
  useEffect(() => {
    if (reduceMotion) return;
    queueMicrotask(() => {
      const connection = (
        navigator as Navigator & { connection?: { saveData?: boolean } }
      ).connection;
      if (connection?.saveData) return;
      setUseVideo(true);
    });
  }, [reduceMotion]);

  /* ---- cursor attention ------------------------------------------------- */

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const attention = { stiffness: 55, damping: 20, mass: 1.1 };
  const smoothX = useSpring(pointerX, attention);
  const smoothY = useSpring(pointerY, attention);

  const rotateY = useTransform(smoothX, [-1, 1], [-MAX_TILT, MAX_TILT]);
  const rotateX = useTransform(smoothY, [-1, 1], [MAX_TILT, -MAX_TILT]);

  useEffect(() => {
    if (reduceMotion || !finePointer) return;

    function handlePointerMove(event: PointerEvent) {
      pointerX.set((event.clientX / window.innerWidth) * 2 - 1);
      pointerY.set((event.clientY / window.innerHeight) * 2 - 1);
    }

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [pointerX, pointerY, reduceMotion, finePointer]);

  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <section
      ref={stage}
      id="top"
      className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden"
    >
      {/* Warm wash behind the whole stage. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          background:
            "radial-gradient(55% 42% at 50% 42%, rgba(197,156,64,0.09) 0%, rgba(11,11,11,0) 70%)",
        }}
      />

      {/* Atmospheric embers — cheap, GPU-only, hidden under reduced motion. */}
      {!reduceMotion && <Embers />}

      {/*
       * The stage: the wreath behind, looping lion in front.
       *
       * It also owns the pointer variables SensorSweep publishes (`--mx`,
       * `--my`, `--hole-r`). The lion masks itself against them and the scan
       * reveals itself against them, which is what keeps the hole and the
       * wireframe locked together. The transition lives here because that is
       * where `--hole-r` actually changes.
       */}
      <div
        className="relative flex w-full max-w-4xl flex-1 items-center justify-center px-6 pt-16"
        style={{ transition: "--hole-r 380ms cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <LaurelWreath progress={scrollYProgress} />

        {/* Looping roar. */}
        {useVideo && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              maskImage: LION_HOLE,
              WebkitMaskImage: LION_HOLE,
              opacity: reduceMotion ? 1 : lionVeil,
              scale: reduceMotion ? 1 : lionRecede,
              /*
               * The matte clip carries its own black background, which would
               * otherwise sit as a slab over the wreath. Screening it drops
               * every black pixel and keeps the bright ones, which on this
               * near-black stage reads as the transparency the alpha clip has
               * natively. The blend belongs here rather than on the video
               * itself: the mask above opens a stacking context, and a blend
               * inside it would have nothing to blend against.
               */
              mixBlendMode: videoMode === "matte" ? "screen" : undefined,
            }}
          >
            <HeroLionVideo
              pointerX={smoothX}
              pointerY={smoothY}
              onReady={(mode) => {
                setVideoMode(mode);
                setVideoReady(true);
              }}
              onVideoRef={(el) => {
                lionVideo.current = el;
              }}
            />
          </motion.div>
        )}

        {/*
         * Still — the stand-in while the video loads, and the fallback.
         *
         * The scroll veil and the entrance animation are kept on separate
         * elements on purpose: bound to the same node they would both claim
         * `opacity` and `scale`, and the scroll binding would stamp on the
         * fade-in.
         */}
        {!(useVideo && videoReady) && (
          <motion.div
            className="pointer-events-none relative z-10"
            style={
              reduceMotion
                ? undefined
                : { opacity: lionVeil, scale: lionRecede }
            }
          >
            <motion.div
              className="[perspective:1200px]"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1.5, delay: 0.55, ease }}
            >
              <motion.div
                style={reduceMotion ? undefined : { rotateX, rotateY }}
                className="[transform-style:preserve-3d]"
              >
                <Image
                  src={LION_SRC}
                  alt="Harekar Group lion emblem"
                  width={1400}
                  height={887}
                  priority
                  sizes="(min-width: 1024px) 40rem, (min-width: 640px) 30rem, 20rem"
                  className="mx-auto h-auto w-[20rem] object-contain drop-shadow-[0_30px_70px_rgba(0,0,0,0.75)] sm:w-[30rem] lg:w-[40rem]"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}

        {/* The lion resolves into a scanned wireframe under the pointer. */}
        <SensorSweep videoRef={lionVideo} />
      </div>

      {/* Typography — arrives after the lion has settled. */}
      <div className="relative z-10 mx-auto max-w-3xl px-6 pb-20 text-center">
        <motion.p
          className="text-gold/80 text-xs tracking-[0.35em] uppercase"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.35, ease }}
        >
          {t("eyebrow")}
        </motion.p>

        <motion.h1
          className="font-display text-bone mt-4 text-4xl leading-[1.08] font-light text-balance sm:text-5xl lg:text-6xl"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.5, ease }}
        >
          {t("title")}
        </motion.h1>

        <motion.p
          className="text-bone/60 mx-auto mt-5 max-w-xl text-base leading-relaxed text-pretty"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.65, ease }}
        >
          {t("subtitle")}
        </motion.p>

        <motion.div
          className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.8, ease }}
        >
          <Link
            href="/contact"
            className="bg-gold text-ink hover:bg-gold-bright cursor-pointer rounded-full px-8 py-3.5 text-sm font-medium transition-colors"
          >
            {tCta("primary")}
          </Link>
          <a
            href="#intelligence"
            className="border-bone/25 text-bone/85 hover:border-gold hover:text-gold cursor-pointer rounded-full border px-8 py-3.5 text-sm transition-colors"
          >
            {t("scroll")}
          </a>
        </motion.div>
      </div>

      {/* Scroll cue. */}
      {!reduceMotion && (
        <motion.div
          aria-hidden
          className="absolute bottom-5 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.4, duration: 1 }}
        >
          <motion.div
            className="border-bone/25 flex h-9 w-5 items-start justify-center rounded-full border pt-1.5"
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="bg-gold h-1.5 w-0.5 rounded-full" />
          </motion.div>
        </motion.div>
      )}
    </section>
  );
}

/**
 * A handful of slow-drifting gold embers. Pure CSS transforms on eight
 * absolutely-positioned dots — no canvas, no render loop.
 */
function Embers() {
  // Deterministic positions so server and client render identically.
  const embers = [
    { left: "12%", top: "30%", size: 3, duration: 11, delay: 0 },
    { left: "22%", top: "64%", size: 2, duration: 13, delay: 1.2 },
    { left: "35%", top: "22%", size: 2, duration: 15, delay: 2.5 },
    { left: "58%", top: "18%", size: 3, duration: 12, delay: 0.8 },
    { left: "72%", top: "38%", size: 2, duration: 14, delay: 3.1 },
    { left: "82%", top: "58%", size: 3, duration: 16, delay: 1.9 },
    { left: "66%", top: "76%", size: 2, duration: 12, delay: 4.2 },
    { left: "30%", top: "82%", size: 2, duration: 15, delay: 2.2 },
  ];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {embers.map((ember, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            left: ember.left,
            top: ember.top,
            width: ember.size,
            height: ember.size,
            background: "rgba(239,204,110,0.55)",
            boxShadow: "0 0 6px 1px rgba(197,156,64,0.35)",
          }}
          animate={{ y: [0, -30, 0], opacity: [0, 0.9, 0] }}
          transition={{
            duration: ember.duration,
            delay: ember.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
