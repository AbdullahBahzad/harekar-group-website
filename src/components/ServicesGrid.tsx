"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import ServiceIcon from "@/components/ServiceIcon";
import { serviceGroups } from "@/data/services";
import type { ResolvedService } from "@/lib/services";
import { cn } from "@/lib/utils";

/** "All" first, then the groups in the order the catalogue defines them. */
const filters = ["all", ...serviceGroups.map((group) => group.id)] as const;

/**
 * Every service line at once, with a filter by group.
 *
 * Replaces the rotating 3D orbit. The orbit showed about five of the thirteen
 * services at a time, only the centre card had readable text, no description
 * was visible at all, and a visitor had to swipe through the lot to find the
 * one they wanted. A grid puts every line, its photograph and its description
 * on screen together; the filter is the "self-identify by need" the grouping
 * was always meant to give (see `data/services.ts`).
 *
 * The cards come from the console like the orbit's did — copy, group, icon and
 * photograph are all edited there, so nothing here is hardcoded per service.
 */
export default function ServicesGrid({
  services,
}: {
  services: ResolvedService[];
}) {
  const t = useTranslations("services");
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState<(typeof filters)[number]>("all");

  const visible =
    active === "all"
      ? services
      : services.filter((service) => service.group === active);

  const countFor = (id: (typeof filters)[number]) =>
    id === "all"
      ? services.length
      : services.filter((service) => service.group === id).length;

  return (
    <div>
      {/* Wraps on a phone rather than scrolling sideways, so no filter hides. */}
      <div
        role="group"
        aria-label={t("groups.all")}
        className="flex flex-wrap gap-2.5"
      >
        {filters.map((id) => {
          const count = countFor(id);
          // A group the console has emptied would be a dead filter.
          if (id !== "all" && count === 0) return null;

          return (
            <button
              key={id}
              type="button"
              aria-pressed={active === id}
              onClick={() => setActive(id)}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-full border px-5 text-sm transition-colors duration-200",
                active === id
                  ? "border-gold/60 bg-gold/12 text-gold"
                  : "border-bone/16 text-bone/70 hover:border-bone/35 hover:text-bone",
              )}
            >
              {t(`groups.${id}`)}
              <span
                className={cn(
                  "text-xs tabular-nums",
                  active === id ? "text-gold/80" : "text-bone/45",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((service, index) => (
            <motion.li
              key={service.id}
              layout={!reduceMotion}
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.5,
                delay: reduceMotion ? 0 : (index % 3) * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group"
            >
              <article className="border-bone/12 bg-surface/20 hover:border-gold/45 flex h-full flex-col overflow-hidden rounded-2xl border transition-colors duration-300">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={service.imageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  {/* Fades the photo into the card so the text below reads as one piece. */}
                  <div
                    aria-hidden
                    className="from-ink/95 via-ink/25 absolute inset-0 bg-gradient-to-t to-transparent"
                  />

                  <span className="border-gold/35 bg-ink/70 text-gold absolute start-4 top-4 flex size-11 items-center justify-center rounded-full border backdrop-blur-sm">
                    {service.icon ? (
                      <ServiceIcon name={service.icon} className="size-5" />
                    ) : (
                      <span className="text-xs tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    )}
                  </span>

                  <span className="text-gold-bright absolute start-5 bottom-4 text-[11px] tracking-[0.16em] uppercase">
                    {t(`groups.${service.group}`)}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-display text-bone text-2xl leading-snug">
                    {service.title}
                  </h3>
                  <p className="text-bone/65 mt-3 text-sm leading-relaxed text-pretty">
                    {service.description}
                  </p>
                  <div className="mt-auto pt-6">
                    <span
                      aria-hidden
                      className="bg-gold/50 group-hover:bg-gold block h-px w-10 transition-all duration-500 group-hover:w-24"
                    />
                  </div>
                </div>
              </article>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
