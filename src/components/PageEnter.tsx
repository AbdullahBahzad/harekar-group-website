"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * The public site's entrance — a short fade up, on the same easing curve as
 * `Reveal` — played each time a console or portal page opens. Used from the
 * segments' `template.tsx`, which Next re-mounts on every navigation, so the
 * motion runs per page rather than once per session.
 *
 * Always a `motion.div`, with the transition zeroed under reduced motion —
 * the same hydration reasoning as `Reveal`.
 */
export default function PageEnter({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
