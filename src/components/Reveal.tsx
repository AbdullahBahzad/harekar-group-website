"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Fades its children up into place the first time they scroll into view.
 *
 * Under reduced motion the same element is rendered and only the transition
 * is dropped. Swapping to a plain `<div>` instead is a trap: the server cannot
 * know the visitor's motion setting, so it always renders the hidden starting
 * state, and React does not patch mismatched attributes on hydration — the
 * content would stay at `opacity: 0` for exactly the visitors who asked for
 * less motion.
 */
export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }
      }
    >
      {children}
    </motion.div>
  );
}
