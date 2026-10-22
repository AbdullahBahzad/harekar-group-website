"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Pointer travel, in pixels, that counts as a swipe to the next photo. */
const SWIPE_PX = 40;

/**
 * A service's photos: one large, with arrows, a count and a strip of
 * thumbnails beneath. Swipe on a phone, arrow keys once focused. A service
 * with a single photo shows just that photo, with no controls to suggest
 * there is more.
 */
export default function ServiceGallery({ images, title }: { images: string[]; title: string }) {
  const t = useTranslations("services");
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const swipeFrom = useRef<number | null>(null);
  const count = images.length;
  const many = count > 1;

  function go(next: number) {
    setDirection(next > index || (index === count - 1 && next === 0) ? 1 : -1);
    setIndex(((next % count) + count) % count);
  }

  const offset = reduceMotion ? 0 : 36;

  return (
    <div className="min-w-0">
      <div
        tabIndex={many ? 0 : undefined}
        aria-roledescription={many ? "carousel" : undefined}
        aria-label={title}
        onKeyDown={(event) => {
          if (!many) return;
          const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
          if (event.key === "ArrowRight") go(index + (rtl ? -1 : 1));
          if (event.key === "ArrowLeft") go(index + (rtl ? 1 : -1));
        }}
        onPointerDown={(event) => {
          swipeFrom.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (!many || swipeFrom.current === null) return;
          const dx = event.clientX - swipeFrom.current;
          swipeFrom.current = null;
          if (Math.abs(dx) < SWIPE_PX) return;
          const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
          // A leftward swipe brings the next photo — mirrored in RTL.
          go(index + ((dx < 0) !== rtl ? 1 : -1));
        }}
        className="focus-visible:ring-gold group relative aspect-[4/3] touch-pan-y overflow-hidden rounded-2xl bg-black outline-none select-none focus-visible:ring-2"
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={index}
            custom={direction}
            initial={{ opacity: 0, x: direction * offset }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * offset }}
            transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={images[index]}
              alt={many ? t("galleryPhoto", { title, n: index + 1, total: count }) : title}
              fill
              sizes="(min-width: 1024px) 45rem, 100vw"
              quality={90}
              draggable={false}
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {many && (
          <>
            <div className="pointer-events-none absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between">
              <GalleryArrow direction="prev" label={t("galleryPrev")} onClick={() => go(index - 1)} />
              <GalleryArrow direction="next" label={t("galleryNext")} onClick={() => go(index + 1)} />
            </div>
            <span
              dir="ltr"
              className="absolute end-3 bottom-3 rounded-full bg-black/65 px-3 py-1 text-xs font-bold text-white tabular-nums backdrop-blur"
            >
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {many && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={t("galleryPhoto", { title, n: i + 1, total: count })}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "focus-visible:ring-gold relative block h-14 w-20 cursor-pointer overflow-hidden rounded-lg border-2 outline-none transition-[border-color,opacity] focus-visible:ring-2 sm:h-16 sm:w-24",
                  i === index ? "border-gold" : "border-transparent opacity-60 hover:opacity-100",
                )}
              >
                <Image src={src} alt="" fill sizes="6rem" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GalleryArrow({
  direction,
  label,
  onClick,
}: {
  direction: "prev" | "next";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      aria-label={label}
      className="hover:bg-gold hover:text-ink focus-visible:ring-gold pointer-events-auto flex size-11 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white outline-none backdrop-blur transition-colors focus-visible:ring-2"
    >
      <svg viewBox="0 0 24 24" className="size-4 rtl:rotate-180" aria-hidden>
        <path
          d={direction === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </button>
  );
}
