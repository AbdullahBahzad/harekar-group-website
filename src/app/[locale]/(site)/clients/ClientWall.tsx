"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  clientCategories,
  clientLogos,
  LOGO_CELL_ASPECT,
  type ClientCategory,
} from "@/lib/client-logos";

type Filter = ClientCategory | "all";
const filters: Filter[] = ["all", ...clientCategories];

export default function ClientWall() {
  const t = useTranslations("clients");
  const reduceMotion = useReducedMotion();
  const [filter, setFilter] = useState<Filter>("all");

  const visible =
    filter === "all"
      ? clientLogos
      : clientLogos.filter((logo) => logo.category === filter);

  return (
    <div>
      <div
        role="group"
        aria-label={t("filterLabel")}
        className="flex flex-wrap items-center gap-2"
      >
        {filters.map((key) => {
          const selected = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={selected}
              className={`focus-visible:ring-gold/40 min-h-11 cursor-pointer rounded-full border px-5 text-sm transition-colors outline-none focus-visible:ring-2 ${
                selected
                  ? "border-gold bg-gold text-ink"
                  : "border-bone/15 text-bone/60 hover:border-gold/50 hover:text-bone"
              }`}
            >
              {t(`groups.${key}`)}
            </button>
          );
        })}
      </div>

      {/* Announced on filter change so the result count is not sighted-only. */}
      <p aria-live="polite" className="text-bone/40 mt-6 text-xs tracking-[0.2em] uppercase">
        {t("countLabel", { count: visible.length })}
      </p>

      <ul className="mt-6 grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((logo, i) => (
          <motion.li
            key={logo.n}
            layout={!reduceMotion}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.3,
              delay: reduceMotion ? 0 : Math.min(i, 12) * 0.02,
              ease: [0.22, 1, 0.36, 1],
            }}
            /*
             * A single-pixel gap over a lit background paints the hairline
             * grid, so each cell needs no border of its own and adjacent
             * borders never double up into a 2px seam.
             */
            className="bg-bone/10"
          >
            <motion.div
              className="bg-ink relative overflow-hidden"
              style={{ aspectRatio: String(LOGO_CELL_ASPECT) }}
              initial="rest"
              animate="rest"
              whileHover="hover"
            >
              {/* Gold wash rising from the base of the cell. */}
              <motion.span
                aria-hidden
                className="from-gold/12 absolute inset-0 bg-gradient-to-t to-transparent"
                variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />

              {/* Gold rule that draws in along the bottom edge. */}
              <motion.span
                aria-hidden
                className="bg-gold absolute inset-x-0 bottom-0 h-px origin-left"
                variants={{
                  rest: { scaleX: 0, opacity: 0 },
                  hover: { scaleX: reduceMotion ? 0 : 1, opacity: 1 },
                }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />

              {/*
               * `w`, `cx` and `cy` come from the measured alpha bounding box.
               * left/top place this wrapper's corner at the cell centre, then
               * x/y pull the *artwork's* centre onto that point — correcting
               * the padding and off-centre framing baked into each source file.
               *
               * `transformOrigin` is the artwork's centre rather than the
               * file's, which is what lets the hover scale grow the mark in
               * place. With the origin anywhere else the scale would drag the
               * logo back off centre, undoing the normalisation, because the
               * translate is a fixed offset while the scale is not.
               */}
              <motion.div
                className="absolute top-1/2 left-1/2"
                style={{
                  width: `${logo.w}%`,
                  transformOrigin: `${logo.cx}% ${logo.cy}%`,
                }}
                variants={{
                  rest: {
                    x: `${-logo.cx}%`,
                    y: `${-logo.cy}%`,
                    scale: 1,
                    opacity: 0.55,
                  },
                  hover: {
                    x: `${-logo.cx}%`,
                    y: `${-logo.cy}%`,
                    scale: reduceMotion ? 1 : 1.07,
                    opacity: 1,
                  },
                }}
                transition={{
                  scale: { type: "spring", stiffness: 300, damping: 18 },
                  opacity: { duration: 0.25, ease: "easeOut" },
                }}
              >
                <Image
                  src={`/clients/logo-${logo.n}.png`}
                  alt={
                    logo.name ??
                    t("logoAlt", { category: t(`groups.${logo.category}`) })
                  }
                  width={1772}
                  height={1772}
                  sizes="(min-width: 1024px) 20vw, (min-width: 640px) 28vw, 42vw"
                  loading={i < 8 ? "eager" : "lazy"}
                  className="h-auto w-full"
                />
              </motion.div>
            </motion.div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
