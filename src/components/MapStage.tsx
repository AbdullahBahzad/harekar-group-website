"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

/**
 * The dimensional stage the Iraq map arrives on.
 *
 * As the visitor scrolls in, the map tilts up from a distant, reclined angle to
 * face the viewer. Scroll position drives the whole approach, so scrolling up
 * reverses it naturally.
 *
 * There used to be radar dressing behind the map — concentric gold rings,
 * cross-hairs, and a rotating sweep wedge. All of it was removed: it read as
 * clutter around the one thing on the screen that matters, the map.
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

  return (
    <div ref={ref} className="relative [perspective:1400px]">
      {/*
       * The tilting stage carrying the interactive map.
       *
       * Deliberately not `transformStyle: "preserve-3d"`. Leaflet positions
       * every pin with `translate3d`, so under `preserve-3d` each one became
       * its own plane in a 3D rendering context, and Chrome's hit-testing of
       * those planes fails away from the middle of the map — pins near the
       * edges drew fine but ignored clicks. The tilt only needs the parent's
       * `perspective` acting on this one flat element, which it still does.
       */}
      <motion.div
        style={
          reduceMotion
            ? undefined
            : {
                rotateX: tilt,
                y: rise,
                opacity: fade,
                scale: approach,
              }
        }
      >
        {children}
      </motion.div>
    </div>
  );
}
