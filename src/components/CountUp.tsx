"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

const format = (n: number) => Math.round(n).toLocaleString("en-US");

/**
 * A figure that counts up from zero the first time it scrolls into view.
 *
 * The real value is what the server renders, so search engines, screen
 * readers, visitors without JavaScript and visitors who prefer reduced motion
 * all get the final number. The count itself is written straight to the
 * node's text on each frame rather than through React state — one re-render
 * per frame for ten figures would be wasted work — and is hidden from
 * assistive tech, which reads the static copy beside it instead.
 */
export default function CountUp({
  value,
  className,
  duration = 1800,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion) return;

    let frame = 0;
    el.textContent = format(0);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / duration);
          // Ease-out: quick at first, settling onto the final figure.
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = format(value * eased);
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      el.textContent = format(value);
    };
  }, [value, duration, reduceMotion]);

  return (
    <>
      <span ref={ref} aria-hidden className={className}>
        {format(value)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
