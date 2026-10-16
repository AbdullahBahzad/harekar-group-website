"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Unveils a photograph the first time it scrolls into view: the frame opens
 * upward from the bottom edge while the picture inside settles from a slight
 * zoom. Wrap a `fill` image (or anything absolutely positioned) — the wrapper
 * takes `className` for its own placement, `absolute inset-0` by default.
 *
 * The in-view watch sits on the outer element, which is never clipped, and
 * drives the frame and the picture through variants. Watching the clipped
 * frame itself does not work: fully closed, it counts as invisible, so it
 * would never be seen entering the viewport and never open.
 *
 * Same markup under reduced motion, only the timing dropped (see `Reveal`).
 */
export default function RevealImage({
  children,
  className = "absolute inset-0",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const timing = (duration: number) =>
    reduceMotion ? { duration: 0 } : { duration, delay, ease };

  const frame: Variants = {
    hidden: { clipPath: "inset(100% 0% 0% 0%)" },
    shown: { clipPath: "inset(0% 0% 0% 0%)", transition: timing(1.1) },
  };
  const picture: Variants = {
    hidden: { scale: 1.18 },
    shown: { scale: 1, transition: timing(1.6) },
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "-60px" }}
    >
      <motion.div className={cn("absolute inset-0 overflow-hidden")} variants={frame}>
        <motion.div className="absolute inset-0" variants={picture}>
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
