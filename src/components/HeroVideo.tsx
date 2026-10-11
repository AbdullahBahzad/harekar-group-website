"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

/**
 * The company's own footage — the Erbil office, the fleet, the team — cut
 * from the source film into two H.264 renditions. The phone file is a quarter
 * of the desktop one; `<source media>` lets the browser pick before it
 * downloads anything.
 */
const VIDEO_DESKTOP = "/video/harekar-hero.mp4";
const VIDEO_MOBILE = "/video/harekar-hero-960.mp4";
const POSTER = "/video/harekar-hero-poster.jpg";

/**
 * The opening section: a full-bleed banner video under a navy wash, with the
 * headline, a short description, the primary "Request a Security Assessment"
 * action and a secondary link to the services.
 *
 * Full-screen, with the site header floating transparent over it. On a phone
 * the text and the button sit in the first screen — the section is sized so
 * nothing important falls below the fold.
 */
export default function HeroVideo({
  overrides,
}: {
  /**
   * Eyebrow/title/subtitle resolved server-side from the console's
   * `SiteContent` row, or the shipped translation if nothing was saved there.
   */
  overrides: { eyebrow: string; title: string; subtitle: string };
}) {
  const t = useTranslations("hero");
  const tCta = useTranslations("cta");
  const reduceMotion = useReducedMotion();
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  /*
   * Autoplay is started from here rather than by the `autoPlay` attribute, so
   * that reduced motion and Data Saver are honoured: those visitors get the
   * still poster and a play button instead of a 15MB download they did not
   * ask for.
   */
  useEffect(() => {
    const el = video.current;
    if (!el || reduceMotion) return;
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    if (connection?.saveData) return;
    el.play().catch(() => {
      // Autoplay refused (e.g. low-power mode) — the poster stays up.
    });
  }, [reduceMotion]);

  function toggle() {
    const el = video.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }

  /*
   * The same props on the server and the client, with only the timing
   * dropped under reduced motion — see the note in `Reveal` for why the
   * starting state must not depend on the motion setting.
   */
  const ease = [0.22, 1, 0.36, 1] as const;
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: reduceMotion ? { duration: 0 } : { duration: 0.8, delay, ease },
  });

  return (
    <section
      id="top"
      className="tone-navy bg-ink relative isolate flex min-h-[86svh] items-center overflow-hidden sm:min-h-svh"
    >
      <video
        ref={video}
        className="absolute inset-0 -z-20 h-full w-full object-cover"
        poster={POSTER}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        <source src={VIDEO_MOBILE} type="video/mp4" media="(max-width: 767px)" />
        <source src={VIDEO_DESKTOP} type="video/mp4" />
      </video>

      {/*
       * Navy wash. Heavier on the reading side and along the bottom so white
       * text holds its contrast over a bright, sunlit frame; lighter elsewhere
       * so the footage still reads as footage.
       */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(16,29,47,0.92)_0%,rgba(16,29,47,0.72)_45%,rgba(16,29,47,0.35)_100%)] rtl:bg-[linear-gradient(270deg,rgba(16,29,47,0.92)_0%,rgba(16,29,47,0.72)_45%,rgba(16,29,47,0.35)_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-[rgba(16,29,47,0.85)] to-transparent"
      />

      {/* `pt-28` clears the transparent header floating over the video. */}
      <div className="mx-auto w-full max-w-360 px-4 pt-28 pb-20 sm:px-6 lg:px-10">
        <div className="max-w-2xl">
          <motion.p
            className="text-gold-deep flex items-center gap-3 text-sm font-bold tracking-wide sm:text-base"
            {...rise(0.1)}
          >
            <span aria-hidden className="bg-gold h-0.5 w-8 rounded-full" />
            {overrides.eyebrow}
          </motion.p>

          <motion.h1
            className="font-display text-bone mt-5 text-4xl leading-[1.1] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl"
            {...rise(0.2)}
          >
            {overrides.title}
          </motion.h1>

          <motion.p
            className="text-bone/85 mt-6 max-w-xl text-lg leading-relaxed text-pretty"
            {...rise(0.3)}
          >
            {overrides.subtitle}
          </motion.p>

          <motion.div
            className="mt-9 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:gap-6"
            {...rise(0.4)}
          >
            <a
              href="#contact"
              className="bg-gold text-ink hover:bg-gold-bright focus-visible:ring-bone inline-flex min-h-13 items-center justify-center rounded-full px-8 text-base font-bold shadow-[0_10px_30px_-10px_rgba(184,154,96,0.6)] transition-colors outline-none focus-visible:ring-2"
            >
              {tCta("primary")}
            </a>
            <a
              href="#services"
              className="text-bone hover:text-gold-deep group inline-flex min-h-12 items-center justify-center gap-2 text-base font-semibold transition-colors sm:justify-start"
            >
              {tCta("explore")}
              <svg
                viewBox="0 0 16 16"
                className="size-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
                fill="none"
                aria-hidden
              >
                <path
                  d="M1 8h14M15 8l-6-6M15 8l-6 6"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </motion.div>
        </div>
      </div>

      {/* Moving content must be stoppable (WCAG 2.2.2). */}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? t("pauseVideo") : t("playVideo")}
        className="border-bone/30 text-bone/85 hover:border-gold hover:text-gold-deep absolute end-4 bottom-4 flex size-11 cursor-pointer items-center justify-center rounded-full border bg-[rgba(16,29,47,0.55)] backdrop-blur-sm transition-colors sm:end-6 sm:bottom-6"
      >
        {playing ? (
          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
            <path d="M4 2.5h2.5v11H4zM9.5 2.5H12v11H9.5z" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
            <path d="M4.5 2.5v11l9-5.5z" fill="currentColor" />
          </svg>
        )}
      </button>
    </section>
  );
}
