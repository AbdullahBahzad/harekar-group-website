"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * The illuminated golden LED halo behind the hero lion.
 *
 * Deliberately inert: it takes no scroll or cursor input, so it never moves,
 * scales, or drifts while the lion animates in front of it. Its only motion is
 * a slow, constant rotation of the specular glints around the rim — a fixed
 * architectural light the lion performs inside of.
 *
 * Rendered as layered SVG strokes rather than a baked image so it stays sharp
 * at any size and tints straight from the brand tokens.
 */
export default function GoldRing() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
    >
      <motion.div
        className="relative aspect-square w-[92%] max-w-[42rem]"
        // Fades up on load, then holds position permanently.
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Warm volumetric bloom filling the ring's interior. */}
        <motion.div
          className="absolute inset-[8%] rounded-full blur-2xl"
          style={{
            background:
              "radial-gradient(circle, rgba(197,156,64,0.28) 0%, rgba(197,156,64,0.08) 46%, rgba(11,11,11,0) 72%)",
          }}
          animate={reduceMotion ? undefined : { opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          fill="none"
        >
          <defs>
            <linearGradient id="ring-stroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-gold-bright)" />
              <stop offset="55%" stopColor="var(--color-gold)" />
              <stop offset="100%" stopColor="#7c611f" />
            </linearGradient>
            <radialGradient id="ring-inner-shade" cx="50%" cy="46%" r="50%">
              <stop offset="70%" stopColor="rgba(11,11,11,0)" />
              <stop offset="100%" stopColor="rgba(11,11,11,0.55)" />
            </radialGradient>
          </defs>

          {/* Soft outer glow of the LED strip. */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="var(--color-gold)"
            strokeOpacity="0.28"
            strokeWidth="3.4"
            style={{ filter: "blur(2.4px)" }}
          />
          {/* The crisp illuminated ring itself. */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="url(#ring-stroke)"
            strokeWidth="0.7"
          />
          {/* Bright inner highlight edge for the metallic LED read. */}
          <circle
            cx="50"
            cy="50"
            r="44.2"
            stroke="var(--color-gold-bright)"
            strokeOpacity="0.5"
            strokeWidth="0.25"
          />
          {/* Interior vignette so the lion sits on depth, not a flat disc. */}
          <circle cx="50" cy="50" r="44" fill="url(#ring-inner-shade)" />
        </svg>

        {/*
         * The ring's one permitted motion: specular glints travelling the rim
         * at a constant rate. Two counter-rotating passes at different speeds
         * keep it alive without ever reading as a spinning object.
         */}
        {!reduceMotion && (
          <>
            <motion.svg
              viewBox="0 0 100 100"
              className="absolute inset-0 h-full w-full"
              fill="none"
              animate={{ rotate: 360 }}
              transition={{ duration: 42, repeat: Infinity, ease: "linear" }}
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="var(--color-gold-bright)"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeDasharray="0.5 40"
                strokeOpacity="0.9"
                style={{ filter: "blur(0.4px)" }}
              />
            </motion.svg>

            <motion.svg
              viewBox="0 0 100 100"
              className="absolute inset-0 h-full w-full"
              fill="none"
              animate={{ rotate: -360 }}
              transition={{ duration: 68, repeat: Infinity, ease: "linear" }}
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="var(--color-gold-bright)"
                strokeWidth="0.8"
                strokeLinecap="round"
                strokeDasharray="0.4 63"
                strokeOpacity="0.6"
                style={{ filter: "blur(0.5px)" }}
              />
            </motion.svg>
          </>
        )}
      </motion.div>
    </div>
  );
}
