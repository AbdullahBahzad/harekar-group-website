"use client";

import { useState } from "react";
import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { paintedWithAlpha } from "@/lib/video-alpha";

/**
 * The lit branch: the same laurel, with the LED shimmer animated through it.
 *
 * A VP9 WebM carrying a real alpha channel (`alpha_mode: 1`). The matte was
 * derived from the footage's own luminance, so the glow fades out through
 * partial alpha instead of stopping at a cut edge — the bloom survives as
 * genuine transparency.
 *
 * Blending it with `screen` was the obvious alternative and does not work
 * here: the branch sits under a parent that carries opacity and transforms,
 * which opens a new stacking context, so `screen` would composite against
 * that empty group rather than the page and leave a black rectangle.
 */
const BRANCH_VIDEO = "/laurel-led.webm";

/** The cutout still, for reduced motion and as the video's stand-in. */
const BRANCH_STILL = "/laurel-branch.png";

/**
 * Scroll progress at which the branches finish closing. Well short of 1 so the
 * wreath is fully shut while the hero is still on screen, rather than
 * completing only once it has scrolled away unseen.
 */
const CLOSE_AT = 0.42;

/**
 * Which half gets the flipped copy of the art.
 *
 * The branch was drawn cupping one way, so exactly one side has to be
 * reflected for the pair to face each other. If the leaves ever look like they
 * are curling outward instead of cradling the lion, flip this to `"right"` —
 * it is the only thing that decides which way the pair opens.
 */
const MIRRORED_SIDE: "left" | "right" = "left";

/**
 * The laurel wreath from the logo, lit as gold LED, standing in for the halo
 * the lion used to sit inside.
 *
 * Two mirrored copies of one branch. Mirroring rather than drawing a second
 * asset guarantees the halves are exact reflections, and gives each side its
 * own transform so they can swing independently.
 *
 * Scrolling down closes them over the lion; scrolling up opens them again.
 * Because the motion is bound to scroll *position* rather than to a direction
 * event, reversal is free and continuous — the wreath tracks the scrollbar
 * exactly, at whatever speed the user moves, and settles wherever they stop.
 *
 * The rest of the hero is unaffected: the roar loop and the pointer dissolve
 * stay entirely independent of scroll.
 */
export default function LaurelWreath({
  progress,
}: {
  /** Hero scroll progress, 0 at rest and 1 once the section has passed. */
  progress: MotionValue<number>;
}) {
  const reduceMotion = useReducedMotion();

  /*
   * Flipped either by the clip's own `error` event, where alpha-WebM cannot
   * decode at all, or once a decoded frame comes back opaque — some mobile
   * browsers accept the codec but silently discard the alpha channel, which
   * would otherwise leave a black rectangle where the branch should be.
   */
  const [videoFailed, setVideoFailed] = useState(false);

  /*
   * A light spring off the raw scroll value. Wheel and trackpad input arrives
   * in coarse jumps; damping it keeps the branches gliding instead of
   * stuttering, without adding enough lag to feel disconnected from the page.
   */
  const close = useSpring(progress, {
    stiffness: 90,
    damping: 24,
    mass: 0.6,
    restDelta: 0.0005,
  });

  const range = [0, CLOSE_AT];

  // Each branch sweeps toward the centre, rolls upright, and grows enough to
  // blanket the space the lion occupies.
  // At rest the branches are pulled further apart and dropped slightly, so the
  // lower leaves settle *below* the lion's paws rather than crossing them; the
  // closed end of each range is unchanged, so only the resting layering moves.
  const sweep = useTransform(close, range, ["-14%", "40%"]);
  const sweepMirror = useTransform(close, range, ["14%", "-40%"]);
  const roll = useTransform(close, range, [0, 26]);
  const rollMirror = useTransform(close, range, [0, -26]);
  const grow = useTransform(close, range, [1, 1.62]);
  const lift = useTransform(close, range, ["7%", "-7%"]);

  // The LED burns hotter as the wreath shuts, so closing reads as sealing.
  const burn = useTransform(close, range, [0.55, 1]);
  const bloom = useTransform(close, [0, CLOSE_AT], [0.35, 0.85]);

  const branch = (side: "left" | "right") => {
    const onRight = side === "right";
    // The art is drawn cupping to the left, so the *left* branch is the
    // flipped one. Both then curve inward and cradle the lion the way the
    // halves do in the mark.
    const flipped = side === MIRRORED_SIDE;

    return (
      <motion.div
        className="absolute top-0 h-full w-1/2"
        style={
          reduceMotion
            ? { [side]: 0, x: onRight ? "14%" : "-14%", y: "7%" }
            : {
                [side]: 0,
                x: onRight ? sweepMirror : sweep,
                y: lift,
                rotate: onRight ? rollMirror : roll,
                scale: grow,
                // Pivot at the stem so the branch swings from its root, the
                // way a real bough would, not like a sliding flat cutout.
                transformOrigin: onRight ? "85% 88%" : "15% 88%",
              }
        }
      >
        <motion.div
          className="relative h-full w-full"
          style={{
            // Mirroring the art, not the motion wrapper, keeps the transform
            // maths above identical for both sides.
            scaleX: flipped ? -1 : 1,
            opacity: reduceMotion ? 0.9 : burn,
          }}
        >
          {reduceMotion || videoFailed ? (
            /* No running light: the cutout still, lit by CSS alone. */
            <div
              className="absolute inset-0"
              style={{
                filter:
                  "drop-shadow(0 0 10px rgba(239,204,110,0.6)) drop-shadow(0 0 30px rgba(197,156,64,0.35))",
              }}
            >
              <Image
                src={BRANCH_STILL}
                alt=""
                fill
                priority
                sizes="(min-width: 1024px) 21rem, 50vw"
                className="object-contain"
              />
            </div>
          ) : (
            /*
             * The lit branch, with the shimmer travelling through the tubing
             * baked into the footage rather than faked with blurs. The clip
             * carries its own alpha, so it drops straight onto the page.
             *
             * A browser without alpha-WebM decodes nothing and fires `error`;
             * one that decodes it but discards the channel is caught once the
             * first frame lands and reads back opaque. Either way the still
             * swaps in — the fallback is self-healing rather than leaving a
             * black plate over the hero.
             */
            <video
              src={BRANCH_VIDEO}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              onError={() => setVideoFailed(true)}
              onLoadedData={(event) => {
                if (paintedWithAlpha(event.currentTarget) === false) {
                  setVideoFailed(true);
                }
              }}
              className="absolute inset-0 h-full w-full object-contain"
              style={{
                filter: "drop-shadow(0 0 22px rgba(197,156,64,0.32))",
              }}
            />
          )}
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
    >
      <motion.div
        className="relative aspect-square w-[92%] max-w-[42rem]"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Warm volumetric bloom the branches sit inside. */}
        <motion.div
          className="absolute inset-[10%] rounded-full blur-2xl"
          style={{
            background:
              "radial-gradient(circle, rgba(239,204,110,0.20) 0%, rgba(197,156,64,0.24) 32%, rgba(197,156,64,0.07) 56%, rgba(11,11,11,0) 74%)",
            opacity: reduceMotion ? 0.6 : bloom,
          }}
        />

        {branch("left")}
        {branch("right")}
      </motion.div>
    </div>
  );
}
