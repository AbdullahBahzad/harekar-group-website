"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import ServiceIcon from "./ServiceIcon";
import { serviceGroups, type ServiceGroupId } from "@/data/services";
import type { ResolvedService } from "@/lib/services";

type Filter = ServiceGroupId | "all";

const filters: Filter[] = ["all", ...serviceGroups.map((g) => g.id)];

/**
 * The filterable service grid.
 *
 * Fed from the resolved catalogue rather than the compiled-in key list, so it
 * shows exactly what the console has published. The group *filters* are still
 * static: they are a fixed taxonomy the console assigns services into, not
 * content in their own right.
 */
export default function ServicesGrid({
  services,
}: {
  services: ResolvedService[];
}) {
  const t = useTranslations("services");
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState<Filter>("all");

  const visible =
    active === "all"
      ? services
      : services.filter((service) => service.group === active);

  return (
    <>
      {/* Path selection — lets a prospect narrow by need before reading cards. */}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={t("filterLabel")}
      >
        {filters.map((filter) => {
          const selected = filter === active;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActive(filter)}
              aria-pressed={selected}
              className={`cursor-pointer rounded-full border px-5 py-2 text-sm transition-colors duration-200 ${
                selected
                  ? "border-gold bg-gold text-ink"
                  : "border-bone/20 text-bone/70 hover:border-gold/60 hover:text-bone"
              }`}
            >
              {t(`groups.${filter}`)}
            </button>
          );
        })}
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {visible.map((service, index) => (
            <motion.article
              key={service.id}
              layout={!reduceMotion}
              initial={reduceMotion ? false : { opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{
                duration: 0.55,
                // Stagger within each visual row, not across the full list.
                delay: reduceMotion ? 0 : (index % 4) * 0.07,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={reduceMotion ? undefined : { y: -5 }}
              className="group border-bone/14 bg-surface/25 hover:border-gold/45 hover:bg-surface/45 relative h-full overflow-hidden rounded-2xl border p-7 transition-colors duration-300 hover:shadow-[0_18px_50px_-24px_rgba(197,156,64,0.55)]"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(120% 80% at 50% 0%, rgba(239,204,110,0.10) 0%, rgba(11,11,11,0) 65%)",
                }}
              />

              <div className="flex items-start justify-between">
                {service.icon && (
                  <ServiceIcon
                    name={service.icon}
                    className="text-gold group-hover:text-gold-bright h-8 w-8 transition-colors"
                  />
                )}
                {/* Details affordance — surfaces on hover, ready for future
                    per-service pages. */}
                <span
                  aria-hidden
                  className="border-bone/20 text-bone/50 group-hover:border-gold/60 group-hover:text-gold flex h-8 w-8 -translate-x-1 items-center justify-center rounded-full border opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 rtl:translate-x-1 rtl:group-hover:translate-x-0"
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 rtl:-scale-x-100">
                    <path
                      d="M3 8h9M8.5 4.5 12 8l-3.5 3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>

              <h2 className="font-display text-bone mt-6 text-xl leading-snug">
                {service.title}
              </h2>
              <p className="text-bone/65 mt-3 text-sm leading-relaxed">
                {service.description}
              </p>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
