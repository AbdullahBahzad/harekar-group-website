"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { paintedWithAlpha } from "@/lib/video-alpha";

/**
 * How the browser is being given the roar.
 *
 * `alpha` — the VP8 WebM carrying a real alpha channel, so only the lion is
 * painted and the golden ring's light reads straight through the frame.
 *
 * `matte` — the same footage flattened onto black as H.264. Safari decodes
 * WebM but discards its alpha channel, which would put an opaque black slab
 * inside the wreath; the caller screen-blends this variant instead, and on a
 * near-black stage the result is very close to the alpha version.
 */
export type LionVideoMode = "alpha" | "matte";

const ROAR_ALPHA = "/lion-roar.webm";
const ROAR_MATTE = "/lion-roar.mp4";

/**
 * The roaring lion, looping continuously inside the golden ring.
 *
 * Playback is autonomous — nothing here is tied to scroll. The only external
 * input is the damped cursor position, which tilts the plate slightly for
 * parallax. Playback pauses whenever the hero scrolls out of view so an
 * off-screen video never burns decode cycles.
 */
export default function HeroLionVideo({
  pointerX,
  pointerY,
  onReady,
}: {
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  /**
   * Fired once the clip can render, so the still can bow out. Carries how the
   * footage is being delivered, because the matte variant needs the caller to
   * blend it and the alpha one must not be blended.
   */
  onReady?: (mode: LionVideoMode) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [source, setSource] = useState(ROAR_ALPHA);

  // Cursor parallax — restrained; the performance lives in the footage.
  const rotateY = useTransform(pointerX, [-1, 1], [-7, 7]);
  const rotateX = useTransform(pointerY, [-1, 1], [4, -4]);

  const readyRef = useRef(onReady);
  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);

  /*
   * The alpha question is asked once, against the WebM. Whichever way it is
   * answered the answer is final — re-running it on the matte clip would
   * always say "no alpha" and flip the source back and forth forever.
   */
  const settled = useRef(false);
  const mode = useRef<LionVideoMode>("alpha");

  const fallBackToMatte = useCallback(() => {
    if (settled.current) return;
    settled.current = true;
    mode.current = "matte";
    setSource(ROAR_MATTE);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    /*
     * Ready is announced only once the source is settled and playback is
     * genuinely running. Announcing earlier would retire the still while the
     * wrong clip is on screen; announcing on anything but `playing` would
     * retire it in favour of a video autoplay had refused, leaving a frozen
     * first frame where the still used to be.
     */
    const announce = () => {
      if (settled.current) readyRef.current?.(mode.current);
    };
    video.addEventListener("playing", announce);

    const start = () => {
      video.play().catch(() => {
        /* Autoplay refused — the still stays. */
      });
    };

    const inspect = () => {
      if (!settled.current) {
        if (paintedWithAlpha(video) === true) {
          settled.current = true;
        } else {
          fallBackToMatte();
          return; // The new source will arrive with its own `loadeddata`.
        }
      }
      start();
    };

    if (video.readyState >= 2) inspect();
    else video.addEventListener("loadeddata", inspect);

    // A browser that cannot decode the WebM at all takes the same exit.
    video.addEventListener("error", fallBackToMatte);

    // Only decode while the hero is actually on screen.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) start();
        else video.pause();
      },
      { rootMargin: "100px" },
    );
    io.observe(video);

    return () => {
      video.removeEventListener("playing", announce);
      video.removeEventListener("loadeddata", inspect);
      video.removeEventListener("error", fallBackToMatte);
      io.disconnect();
    };
  }, [source, fallBackToMatte]);

  return (
    <motion.div
      className="flex h-full w-full items-center justify-center [perspective:1200px]"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.video
        ref={videoRef}
        key={source}
        src={source}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-label="Golden lion roaring"
        /*
         * Sized against the stage's height so the lion keeps the same footing
         * in the ring at every width, and capped by width so a narrow phone
         * cannot push a landscape clip past the edge of the screen.
         */
        className="max-h-full w-auto max-w-full object-contain [height:52%] sm:[height:62%] lg:[height:68%]"
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
      />
    </motion.div>
  );
}
