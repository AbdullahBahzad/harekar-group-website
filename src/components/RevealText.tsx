"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * A heading whose words rise into place one after another the first time it
 * scrolls into view — each word slides up out of its own clipped line box.
 *
 * Words, never letters: Arabic and Kurdish letters join within a word, so
 * splitting any finer would break the script apart. `highlight` is appended
 * in the brand's text gold, for headlines that end on an accent.
 *
 * As with `Reveal`, reduced motion keeps the same markup and only drops the
 * timing, so server and client always render the same starting state.
 */
export default function RevealText({
  text,
  highlight,
  as: Tag = "h2",
  className,
  delay = 0,
}: {
  text: string;
  highlight?: string;
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const MotionTag = motion[Tag];

  const container: Variants = {
    hidden: {},
    shown: {
      transition: reduceMotion
        ? { duration: 0 }
        : { staggerChildren: 0.045, delayChildren: delay },
    },
  };
  const word: Variants = {
    hidden: { y: "110%" },
    shown: {
      y: "0%",
      transition: reduceMotion ? { duration: 0 } : { duration: 0.8, ease },
    },
  };

  const words = [
    ...text.split(/\s+/).filter(Boolean).map((w) => ({ w, accent: false })),
    ...(highlight ?? "").split(/\s+/).filter(Boolean).map((w) => ({ w, accent: true })),
  ];

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "-60px" }}
      variants={container}
    >
      {words.map(({ w, accent }, i) => (
        <span key={i}>
          {/*
           * The clip box is padded and pulled back by the same amount so
           * descenders and Arabic marks above and below the line are not
           * shaved off, while the line spacing stays exactly as set.
           */}
          <span className="-my-[0.15em] inline-block overflow-hidden py-[0.15em] align-bottom">
            <motion.span
              className={cn("inline-block", accent && "text-gold-deep")}
              variants={word}
            >
              {w}
            </motion.span>
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </MotionTag>
  );
}
