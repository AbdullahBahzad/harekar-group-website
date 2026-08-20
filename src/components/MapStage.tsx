"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

/**
 * The dimensional stage the Iraq map arrives on.
 *
 * As the visitor scrolls out of the hero, the expanding gold ring hands off to
 * this section's radar geometry: concentric gold circles contract into place
 * behind the map while the map itself tilts up from a distant, reclined angle
 * to face the viewer. Scroll position drives the whole approach, so scrolling
 * up reverses it naturally.
 */
export default function MapStage({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    // Runs from the stage entering the viewport until it is centred.
    offset: ["start end", "center 0.45"],
  });

  // Map: reclined and distant → upright and present.
  const tiltRaw = useTransform(scrollYProgress, [0, 1], [22, 0]);
  const riseRaw = useTransform(scrollYProgress, [0, 1], [90, 0]);
  const fade = useTransform(scrollYProgress, [0, 0.55], [0.25, 1]);
  const approach = useTransform(scrollYProgress, [0, 1], [0.93, 1]);

  const springCfg = { stiffness: 80, damping: 24 };
  const tilt = useSpring(tiltRaw, springCfg);
  const rise = useSpring(riseRaw, springCfg);

  // Radar rings: arrive from beyond the frame — the hero ring "landing".
  const ringsScale = useTransform(scrollYProgress, [0, 1], [1.7, 1]);
  const ringsFade = useTransform(scrollYProgress, [0, 0.8], [0, 1]);

  return (
    <div ref={ref} className="relative [perspective:1400px]">
      {/* Radar geometry behind the map. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={reduceMotion ? undefined : { scale: ringsScale, opacity: ringsFade }}
      >
        <svg
          viewBox="0 0 100 100"
          className="aspect-square w-full opacity-70"
          fill="none"
        >
          {[46, 36, 26].map((r) => (
            <circle
              key={r}
              cx="50"
              cy="50"
              r={r}
              stroke="var(--color-gold)"
              strokeOpacity={0.1 + (46 - r) * 0.004}
              strokeWidth="0.18"
            />
          ))}
          {/* Cross-hairs */}
          <path
            d="M 50 4 V 96 M 4 50 H 96"
            stroke="var(--color-gold)"
            strokeOpacity="0.06"
            strokeWidth="0.16"
          />
        </svg>

        {/* Slow radar sweep — conic sliver rotating inside the outer ring. */}
        {!reduceMotion && (
          <motion.div
            className="absolute aspect-square w-full rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(197,156,64,0.10) 0deg, rgba(197,156,64,0) 55deg, rgba(197,156,64,0) 360deg)",
              maskImage:
                "radial-gradient(circle, black 0%, black 46%, transparent 46.5%)",
              WebkitMaskImage:
                "radial-gradient(circle, black 0%, black 46%, transparent 46.5%)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
          />
        )}
      </motion.div>

      {/* The tilting stage carrying the interactive map. */}
      <motion.div
        style={
          reduceMotion
            ? undefined
            : {
                rotateX: tilt,
                y: rise,
                opacity: fade,
                scale: approach,
                transformStyle: "preserve-3d",
              }
        }
      >
        {children}
      </motion.div>
    </div>
  );
}
