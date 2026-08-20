"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

/** Maximum tilt in degrees. Small enough that the lion still feels heavy. */
const MAX_TILT = 14;

const LION_SRC = "/lion-body.png";

export default function LionCrest() {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // Normalised cursor position, -1 .. 1 relative to the viewport centre.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  // Heavily damped so the lion settles rather than snapping to the cursor.
  const spring = { stiffness: 55, damping: 20, mass: 1.1 };
  const smoothX = useSpring(pointerX, spring);
  const smoothY = useSpring(pointerY, spring);

  const rotateY = useTransform(smoothX, [-1, 1], [-MAX_TILT, MAX_TILT]);
  const rotateX = useTransform(smoothY, [-1, 1], [MAX_TILT, -MAX_TILT]);

  // The glow drifts against the tilt, which reads as depth behind the figure.
  const glowX = useTransform(smoothX, [-1, 1], [30, -30]);
  const glowY = useTransform(smoothY, [-1, 1], [24, -24]);

  /*
   * Scroll choreography: the lion prowls right, lifts, shrinks and dissolves
   * as the hero scrolls away, handing off to the sections below.
   */
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const fade = useTransform(scrollYProgress, [0, 0.95], [1, 0]);
  const lift = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const shrink = useTransform(scrollYProgress, [0, 1], [1, 0.88]);
  const drift = useTransform(scrollYProgress, [0, 1], [0, 320]);

  const scrollSpring = { stiffness: 90, damping: 24 };
  const opacity = useSpring(fade, scrollSpring);
  const driftX = useSpring(drift, scrollSpring);

  useEffect(() => {
    if (reduceMotion) return;

    function handlePointerMove(event: PointerEvent) {
      pointerX.set((event.clientX / window.innerWidth) * 2 - 1);
      pointerY.set((event.clientY / window.innerHeight) * 2 - 1);
    }

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [pointerX, pointerY, reduceMotion]);

  return (
    <motion.div
      ref={ref}
      className="relative [perspective:1200px]"
      style={
        reduceMotion
          ? undefined
          : { opacity, x: driftX, y: lift, scale: shrink }
      }
    >
      {/* Gold halo, parallaxed behind the figure. */}
      <motion.div
        aria-hidden
        style={reduceMotion ? undefined : { x: glowX, y: glowY }}
        className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
      >
        <motion.div
          className="h-[80%] w-[80%] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(197,156,64,0.32) 0%, rgba(197,156,64,0.10) 45%, rgba(11,11,11,0) 72%)",
          }}
          animate={reduceMotion ? undefined : { opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Cursor tilt */}
      <motion.div
        style={reduceMotion ? undefined : { rotateX, rotateY }}
        className="[transform-style:preserve-3d]"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.86, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {/*
         * Idle life. Breathing is anchored at the paws so the body rises
         * rather than the whole figure floating, and the sway runs on a
         * different period so the two never visibly sync up.
         */}
        <motion.div
          className="relative origin-bottom"
          animate={
            reduceMotion
              ? undefined
              : { scaleY: [1, 1.028, 1], scaleX: [1, 1.014, 1] }
          }
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        >
          {/*
           * Contact shadow. Without it the lion reads as floating; it widens
           * and softens on the breath so the weight feels connected to it.
           */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute bottom-[6%] left-1/2 h-[7%] w-[62%] -translate-x-1/2 rounded-[50%] blur-lg"
            style={{
              background:
                "radial-gradient(ellipse, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0) 72%)",
            }}
            animate={
              reduceMotion
                ? undefined
                : { scaleX: [1, 1.06, 1], opacity: [0.9, 0.72, 0.9] }
            }
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          />

          <motion.div
            className="relative"
            animate={
              reduceMotion
                ? undefined
                : { rotate: [-0.9, 0.9, -0.9], y: [0, -6, 0] }
            }
            transition={{
              rotate: { duration: 9, repeat: Infinity, ease: "easeInOut" },
              y: { duration: 4.2, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            <Image
              src={LION_SRC}
              alt="Harekar Group lion emblem"
              width={1024}
              height={1024}
              priority
              sizes="(min-width: 1024px) 43rem, (min-width: 640px) 32rem, 22rem"
              className="mx-auto h-80 w-80 drop-shadow-[0_30px_70px_rgba(0,0,0,0.75)] sm:h-[32rem] sm:w-[32rem] lg:h-[43rem] lg:w-[43rem]"
            />

            {/*
             * Specular sweep. The lion's own alpha is used as a mask, so the
             * highlight only ever travels across the gold and never spills
             * into the background.
             */}
            {!reduceMotion && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 mix-blend-overlay"
                style={{
                  WebkitMaskImage: `url(${LION_SRC})`,
                  maskImage: `url(${LION_SRC})`,
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                  backgroundImage:
                    "linear-gradient(105deg, transparent 38%, rgba(255,241,204,0.55) 50%, transparent 62%)",
                  backgroundSize: "260% 100%",
                }}
                animate={{ backgroundPosition: ["130% 0%", "-30% 0%"] }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  repeatDelay: 3.5,
                  ease: "easeInOut",
                }}
              />
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
