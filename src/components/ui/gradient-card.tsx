"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Brand palette as raw RGB triplets. The card composites its glow through
 * `radial-gradient` and `box-shadow`, which need concrete colour strings and
 * cannot read the `--color-*` custom properties, so these mirror globals.css
 * by hand. `AMBER` is the hot core of the neon and has no token equivalent —
 * it only ever appears inside a heavy blur, never as a flat surface.
 */
const GOLD = "197, 156, 64";
const GOLD_BRIGHT = "239, 204, 110";
const AMBER = "255, 176, 46";

/** Maximum tilt in degrees. Kept small — past ~6° the text starts to skew. */
const MAX_TILT = 5;

const glow = (strong: boolean) =>
  strong
    ? `0 0 18px 3px rgba(${GOLD_BRIGHT}, 0.45), 0 0 28px 5px rgba(${GOLD}, 0.3), 0 0 38px 7px rgba(${AMBER}, 0.18)`
    : `0 0 13px 2px rgba(${GOLD_BRIGHT}, 0.32), 0 0 22px 4px rgba(${GOLD}, 0.2), 0 0 32px 6px rgba(${AMBER}, 0.12)`;

/** Vertical hairline used at the card's bottom corners. */
const EDGE_FADE =
  `linear-gradient(to top, rgba(${GOLD_BRIGHT}, 0.45) 0%, rgba(${GOLD_BRIGHT}, 0.32) 20%, rgba(${GOLD_BRIGHT}, 0.18) 40%, rgba(${GOLD_BRIGHT}, 0.06) 60%, rgba(${GOLD_BRIGHT}, 0) 80%)`;

export type GradientCardProps = {
  /** Display numeral shown in the badge, e.g. "01". */
  index: string;
  title: string;
  body: string;
  /** Heading level, so the card can sit under whatever precedes it. */
  as?: "h2" | "h3";
  /** Replaces the numeral badge when supplied. */
  icon?: ReactNode;
};

/**
 * A dark glass panel lit from below by a neon gold bloom, which tilts toward
 * the pointer.
 *
 * The depth is layered rather than drawn: a noise wash and a smudge wash break
 * up the flat black so the bloom has something to catch, three blurred radial
 * gradients supply the light, and a lit bottom edge plus two corner hairlines
 * imply a physical rim. Tilt is applied to the card while the inner content
 * counter-rotates at a fraction of the angle, which is what reads as parallax
 * depth instead of the whole panel skewing as one flat plane.
 *
 * The effect is entirely pointer-driven, so it degrades to a static card on
 * touch and under `prefers-reduced-motion` without losing any content.
 */
export function GradientCard({
  index,
  title,
  body,
  as: Heading = "h2",
  icon,
}: GradientCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    setRotation({
      x: -(y / rect.height) * MAX_TILT,
      y: (x / rect.width) * MAX_TILT,
    });
  }

  function handleMouseLeave() {
    setIsHovered(false);
    setRotation({ x: 0, y: 0 });
  }

  /*
   * Under reduced motion the entrance animation would still run as a blur-to-
   * sharp fade, so the mount state is collapsed to the resting state instead
   * of merely shortening it.
   */
  const settle = (delay: number, opacity = 1) =>
    reduceMotion
      ? { initial: false as const, animate: { opacity, filter: "blur(0px)" } }
      : {
          initial: { filter: "blur(3px)", opacity: 0.7 },
          animate: {
            filter: "blur(0px)",
            opacity,
            transition: { duration: 1.2, delay },
          },
        };

  return (
    <motion.div
      ref={cardRef}
      className="relative h-full min-h-[21rem] w-full overflow-hidden rounded-[28px]"
      style={{
        transformStyle: "preserve-3d",
        backgroundColor: "#0e0d0b",
        boxShadow: `0 -10px 100px 10px rgba(${GOLD_BRIGHT}, 0.08), 0 0 10px 0 rgba(0, 0, 0, 0.5)`,
      }}
      initial={{ y: 0 }}
      animate={{
        y: isHovered && !reduceMotion ? -5 : 0,
        rotateX: rotation.x,
        rotateY: rotation.y,
        perspective: 1000,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {/* Glass reflection running corner to corner. */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-[35]"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 80%, rgba(255,255,255,0.05) 100%)",
          backdropFilter: "blur(2px)",
        }}
        animate={{
          opacity: isHovered ? 0.7 : 0.5,
          rotateX: -rotation.x * 0.2,
          rotateY: -rotation.y * 0.2,
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />

      {/* Base. Warm near-black rather than pure black so the gold bloom
          doesn't terminate against a dead flat field. */}
      <div
        className="absolute inset-0 z-0"
        style={{ background: "linear-gradient(180deg, #080705 0%, #000000 70%)" }}
      />

      {/* Film grain — stops the large blurred gradients from banding. */}
      <div
        className="absolute inset-0 z-10 opacity-30 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Low-frequency smudge, as on a handled glass panel. */}
      <div
        className="pointer-events-none absolute inset-0 z-[11] opacity-10 mix-blend-soft-light"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='smudge'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.01' numOctaves='3' seed='5' stitchTiles='stitch'/%3E%3CfeGaussianBlur stdDeviation='10'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23smudge)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Neon gold bloom, thrown in from both bottom corners. */}
      <motion.div
        className="absolute right-0 bottom-0 left-0 z-20 h-2/3"
        style={{
          background: `
            radial-gradient(ellipse at bottom right, rgba(${GOLD_BRIGHT}, 0.42) -10%, rgba(${GOLD}, 0) 70%),
            radial-gradient(ellipse at bottom left, rgba(${AMBER}, 0.34) -10%, rgba(${GOLD}, 0) 70%)
          `,
          filter: "blur(40px)",
        }}
        animate={{
          opacity: isHovered ? 0.8 : 0.62,
          y: isHovered ? rotation.x * 0.5 : 0,
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />

      {/* Hot core, centred low. */}
      <motion.div
        className="absolute right-0 bottom-0 left-0 z-[21] h-2/3"
        style={{
          background: `radial-gradient(circle at bottom center, rgba(${AMBER}, 0.42) -20%, rgba(${GOLD}, 0) 60%)`,
          filter: "blur(45px)",
        }}
        animate={{
          opacity: isHovered ? 0.72 : 0.55,
          y: isHovered ? `calc(10% + ${rotation.x * 0.3}px)` : "10%",
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />

      {/* Lit bottom rim. */}
      <motion.div
        className="absolute right-0 bottom-0 left-0 z-[25] h-[2px]"
        style={{
          background: `linear-gradient(90deg, rgba(${GOLD_BRIGHT}, 0.04) 0%, rgba(${GOLD_BRIGHT}, 0.55) 50%, rgba(${GOLD_BRIGHT}, 0.04) 100%)`,
        }}
        animate={{ boxShadow: glow(isHovered), opacity: isHovered ? 0.9 : 0.75 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />

      {/* Corner hairlines climbing from the lit rim. */}
      <motion.div
        className="absolute bottom-0 left-0 z-[25] h-1/4 w-px rounded-full"
        style={{ background: EDGE_FADE }}
        animate={{ boxShadow: glow(isHovered), opacity: isHovered ? 1 : 0.9 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
      <motion.div
        className="absolute right-0 bottom-0 z-[25] h-1/4 w-px rounded-full"
        style={{ background: EDGE_FADE }}
        animate={{ boxShadow: glow(isHovered), opacity: isHovered ? 1 : 0.9 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />

      {/* Content. Counter-rotates against the tilt to read as parallax. */}
      <motion.div
        className="relative z-40 flex h-full flex-col p-6"
        animate={{
          rotateX: isHovered ? -rotation.x * 0.3 : 0,
          rotateY: isHovered ? -rotation.y * 0.3 : 0,
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <motion.div
          className="relative mb-5 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full"
          style={{ background: "linear-gradient(225deg, #241d10 0%, #14110a 100%)" }}
          initial={reduceMotion ? false : { filter: "blur(3px)", opacity: 0.7 }}
          animate={{
            filter: "blur(0px)",
            opacity: 1,
            boxShadow: isHovered
              ? `0 8px 16px -2px rgba(0,0,0,0.3), 0 4px 8px -1px rgba(0,0,0,0.2), inset 2px 2px 5px rgba(${GOLD_BRIGHT},0.2), inset -2px -2px 5px rgba(0,0,0,0.7)`
              : `0 6px 12px -2px rgba(0,0,0,0.25), 0 3px 6px -1px rgba(0,0,0,0.15), inset 1px 1px 3px rgba(${GOLD_BRIGHT},0.15), inset -2px -2px 4px rgba(0,0,0,0.5)`,
            y: isHovered && !reduceMotion ? -2 : 0,
          }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* Top-left key light. */}
          <div
            className="pointer-events-none absolute top-0 left-0 h-2/3 w-2/3 opacity-40"
            style={{
              background: `radial-gradient(circle at top left, rgba(${GOLD_BRIGHT}, 0.3), transparent 80%)`,
              filter: "blur(10px)",
            }}
          />
          {/* Grounding shadow. */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 h-1/2 w-full opacity-50"
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.4), transparent)",
            }}
          />

          <span className="text-gold-bright relative z-10 text-xs tracking-[0.2em] tabular-nums">
            {icon ?? index}
          </span>
        </motion.div>

        <div className="mb-auto">
          <motion.div {...settle(0.2)}>
            <Heading
              className="font-display text-bone mb-3 text-xl leading-tight font-semibold text-balance"
              style={{ letterSpacing: "-0.01em" }}
            >
              {title}
            </Heading>
          </motion.div>

          <motion.p
            className="text-bone/72 text-sm leading-relaxed font-normal text-pretty"
            {...settle(0.4, 0.9)}
          >
            {body}
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default GradientCard;
