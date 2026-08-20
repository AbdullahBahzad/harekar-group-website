"use client";

import { useEffect, useRef } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";

/**
 * Swap this to change the hero sequence.
 *
 * The clip is a VP8 WebM carrying a real alpha channel (`alpha_mode: 1`), so
 * only the lion is painted and the golden ring's light reads straight through
 * the frame. Browsers without alpha-WebM never fire `loadedmetadata`, which
 * leaves the still in place — the fallback is self-healing.
 */
const ROAR_VIDEO = "/lion-roar.webm";

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
  onVideoRef,
}: {
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  /** Fired once the clip can render, so the still can bow out. */
  onReady?: () => void;
  /**
   * Hands the raw element up so the sensor sweep can sample its frames. The
   * sampler only ever reads — playback stays owned entirely by this component.
   */
  onVideoRef?: (el: HTMLVideoElement | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Cursor parallax — restrained; the performance lives in the footage.
  const rotateY = useTransform(pointerX, [-1, 1], [-7, 7]);
  const rotateX = useTransform(pointerY, [-1, 1], [4, -4]);

  const readyRef = useRef(onReady);
  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);

  // Publish the element for the dot sampler; withdraw it on unmount.
  const videoRefCb = useRef(onVideoRef);
  useEffect(() => {
    videoRefCb.current = onVideoRef;
  }, [onVideoRef]);
  useEffect(() => {
    videoRefCb.current?.(videoRef.current);
    return () => videoRefCb.current?.(null);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    /*
     * Autoplay can be rejected (power saving, data saver). Reporting ready
     * only once playback is actually running means a blocked video leaves the
     * still in place rather than showing a frozen first frame.
     */
    const announce = () => readyRef.current?.();
    video.addEventListener("playing", announce);

    const start = () => {
      video.play().catch(() => {
        /* Autoplay refused — the still stays. */
      });
    };
    if (video.readyState >= 2) start();
    else video.addEventListener("loadeddata", start);

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
      video.removeEventListener("loadeddata", start);
      io.disconnect();
    };
  }, []);

  return (
    <motion.div
      className="flex h-full w-full items-center justify-center [perspective:1200px]"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.video
        ref={videoRef}
        src={ROAR_VIDEO}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-label="Golden lion roaring"
        className="h-[62%] w-auto max-w-none object-contain sm:h-[68%]"
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
      />
    </motion.div>
  );
}
