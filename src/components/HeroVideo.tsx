"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import RevealText from "@/components/RevealText";

/**
 * The company's own footage, as H.264 MP4 — every browser plays it. Phones
 * get the 720p version: they show the frame cropped to a tall screen, and
 * 720p still covers it sharply without sending a desktop's file over mobile
 * data. The browser takes the first `<source>` whose `media` matches, before
 * downloading anything.
 *
 * The files themselves are whatever the Media station in the admin console
 * holds (see `lib/media.ts`), falling back to the shipped ones.
 */
export type HeroMedia = { video: string; videoMobile: string; poster: string };

/**
 * The opening section: a full-bleed banner video under a dark wash, with the
 * headline, a short description and a link to the services. The "Request a
 * Security Assessment" action lives in the header, so it is not repeated here.
 *
 * Sized to its content rather than the screen: the video ends just below the
 * "Explore our services" link, as the company asked, with the site header
 * floating transparent over its top.
 */
export default function HeroVideo({
  overrides,
  media,
}: {
  /**
   * Eyebrow/title/subtitle resolved server-side from the console's
   * `SiteContent` row, or the shipped translation if nothing was saved there.
   */
  overrides: { eyebrow: string; title: string; subtitle: string };
  /** The banner video (computer and phone versions) and its poster. */
  media: HeroMedia;
}) {
  const t = useTranslations("hero");
  const tCta = useTranslations("cta");
  const reduceMotion = useReducedMotion();
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  /*
   * Autoplay is started from here rather than by the `autoPlay` attribute, so
   * that reduced motion and Data Saver are honoured: those visitors get the
   * still poster and a play button instead of a large download they did not
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
      className="tone-navy bg-ink relative isolate flex items-end overflow-hidden"
    >
      <video
        ref={video}
        className="absolute inset-0 -z-20 h-full w-full object-cover"
        poster={media.poster}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        <source src={media.videoMobile} type="video/mp4" media="(max-width: 767px)" />
        <source src={media.video} type="video/mp4" />
      </video>

      {/*
       * Navy wash, only where the text is: heavy on the reading side so white
       * text holds its contrast over a bright, sunlit frame, fading to clear
       * across the rest so the footage keeps its own colour and sharpness.
       */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 max-sm:!bg-none max-sm:bg-[rgba(22,22,22,0.66)] bg-[linear-gradient(90deg,rgba(22,22,22,0.88)_0%,rgba(22,22,22,0.62)_38%,rgba(22,22,22,0.12)_75%,rgba(22,22,22,0)_100%)] rtl:bg-[linear-gradient(270deg,rgba(22,22,22,0.88)_0%,rgba(22,22,22,0.62)_38%,rgba(22,22,22,0.12)_75%,rgba(22,22,22,0)_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-1/4 bg-gradient-to-t from-[rgba(22,22,22,0.6)] to-transparent"
      />

      {/*
       * The top padding clears the floating header and gives the footage room
       * above the text; the bottom padding is what is left of the video below
       * the services link.
       */}
      <div className="mx-auto w-full max-w-360 px-4 pt-36 pb-14 sm:px-6 sm:pt-52 sm:pb-16 lg:px-10">
        <div className="max-w-2xl">
          <motion.p
            className="text-gold-deep flex items-center gap-3 text-sm font-bold tracking-wide sm:text-base"
            {...rise(0.1)}
          >
            <span aria-hidden className="bg-gold h-0.5 w-8 rounded-full" />
            {overrides.eyebrow}
          </motion.p>

          <RevealText
            as="h1"
            text={overrides.title}
            delay={0.15}
            className="font-display text-bone mt-5 text-4xl leading-[1.1] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl"
          />

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
        className="border-bone/30 text-bone/85 hover:border-gold hover:text-gold-deep absolute end-4 bottom-4 flex size-11 cursor-pointer items-center justify-center rounded-full border bg-[rgba(22,22,22,0.55)] backdrop-blur-sm transition-colors sm:end-6 sm:bottom-6"
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
