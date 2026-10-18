"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { iraqBorder, severityColor, type LngLat } from "@/data/iraq";
import { governorateShapes } from "@/data/iraq-governorates";
import { cn } from "@/lib/utils";

const TABS = ["console", "areas", "ask", "reports"] as const;
type Tab = (typeof TABS)[number];
/** How long each feature holds before the tour moves on. */
const HOLD_MS = 6000;
const ease = [0.22, 1, 0.36, 1] as const;

/**
 * "Inside the platform": a self-running tour of the client portal.
 *
 * Four features down one side; the active one expands with its description
 * and a progress line, and the matching panel cross-fades in on the other
 * side — the incident feed, tactical areas on the map, Ask Harekar, the
 * Daily Security Report. It advances on its own, pauses while the reader is
 * hovering or has focus inside it, and any feature can be picked directly.
 * Under reduced motion it does not advance or animate at all.
 *
 * The panels are illustrations of the product, built from example content,
 * and each says so — they are not a feed of real incidents.
 */
export default function PlatformShowcase() {
  const t = useTranslations("showcase");
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState<Tab>("console");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || reduceMotion) return;
    const timer = setTimeout(() => {
      setActive((current) => TABS[(TABS.indexOf(current) + 1) % TABS.length]);
    }, HOLD_MS);
    return () => clearTimeout(timer);
  }, [active, paused, reduceMotion]);

  return (
    <div
      className="mx-auto max-w-360 px-4 pb-24 sm:px-6 lg:px-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="border-bone/12 border-t pt-16">
        <p className="text-gold-deep text-center text-sm font-bold">{t("eyebrow")}</p>
        <h3 className="font-display text-bone mt-3 text-center text-3xl font-bold tracking-tight sm:text-4xl">
          {t("title")}
        </h3>
        <p className="text-bone/75 mx-auto mt-4 max-w-2xl text-center text-lg leading-relaxed text-pretty">
          {t("subtitle")}
        </p>
      </div>

      <div className="mt-12 grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        {/* The features, as a vertical tab list — beneath the panel on a
            phone, so the panel being described is the thing on screen. */}
        <div
          role="tablist"
          aria-orientation="vertical"
          aria-label={t("title")}
          className="order-2 space-y-1 lg:order-1"
        >
          {TABS.map((tab) => {
            const on = tab === active;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                id={`showcase-tab-${tab}`}
                aria-selected={on}
                aria-controls="showcase-panel"
                onClick={() => setActive(tab)}
                className={cn(
                  "relative block w-full cursor-pointer overflow-hidden rounded-e-lg border-s-2 px-5 py-4 text-start transition-colors",
                  on ? "border-gold bg-bone/[0.06]" : "border-bone/12 hover:bg-bone/[0.03]",
                )}
              >
                <span className={cn("block text-xs font-bold", on ? "text-gold-deep" : "text-bone/50")}>
                  {t(`tabs.${tab}.label`)}
                </span>
                <span className={cn("mt-1 block text-base font-semibold", on ? "text-bone" : "text-bone/75")}>
                  {t(`tabs.${tab}.title`)}
                </span>
                {on && (
                  <motion.span
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: reduceMotion ? 0 : 0.35, ease }}
                    className="text-bone/65 mt-2 block text-[15px] leading-relaxed"
                  >
                    {t(`tabs.${tab}.description`)}
                  </motion.span>
                )}
                {/* How long until the tour moves on — always drawn, empty when
                    the tour is paused or motion is reduced. */}
                {on && (
                  <span aria-hidden className="bg-bone/10 absolute inset-x-0 bottom-0 h-0.5">
                    <motion.span
                      key={`${tab}-${paused}`}
                      className="bg-gold block h-full origin-left rtl:origin-right"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: paused || reduceMotion ? 0 : 1 }}
                      transition={{
                        duration: paused || reduceMotion ? 0 : HOLD_MS / 1000,
                        ease: "linear",
                      }}
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* The matching panel. */}
        <div
          id="showcase-panel"
          role="tabpanel"
          aria-labelledby={`showcase-tab-${active}`}
          className="border-bone/12 bg-[#0b1522] relative order-1 h-[26rem] lg:order-2 overflow-hidden rounded-2xl border shadow-[0_30px_70px_-30px_rgba(0,0,0,0.7)] sm:h-[28rem]"
        >
          <span className="border-bone/15 text-bone/55 absolute end-3 top-3 z-20 rounded-full border px-2 py-0.5 text-[10px]">
            {t("example")}
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active}
              className="absolute inset-0"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: reduceMotion ? 0 : 0.4, ease }}
            >
              {active === "console" && <FeedPanel />}
              {active === "areas" && <AreasPanel />}
              {active === "ask" && <AskPanel />}
              {active === "reports" && <ReportPanel />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ---- shared bits ------------------------------------------------------- */

type Severity = "clear" | "elevated" | "critical";

function Tag({ severity }: { severity: Severity }) {
  const t = useTranslations("intelligence.severity");
  const tone = severityColor[severity];
  return (
    <span
      className="rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
      style={{ color: tone, borderColor: `color-mix(in oklab, ${tone} 55%, transparent)` }}
    >
      {t(severity)}
    </span>
  );
}

/** Children rise in one after another as the panel appears. */
function useStagger() {
  const reduceMotion = useReducedMotion();
  // Same starting state either way; reduced motion only drops the timing,
  // so the server render and hydration always agree (see `Reveal`).
  return (index: number, base = 0.15) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: reduceMotion
      ? { duration: 0 }
      : { delay: base + index * 0.12, duration: 0.45, ease },
  });
}

/* ---- 1 · the incident feed ------------------------------------------- */

const FEED: { id: string; severity: Severity; when: string }[] = [
  { id: "row1", severity: "clear", when: "09:40" },
  { id: "row2", severity: "elevated", when: "08:15" },
  { id: "row3", severity: "critical", when: "07:02" },
  { id: "row4", severity: "clear", when: "06:30" },
];

function FeedPanel() {
  const t = useTranslations("showcase.feed");
  const rise = useStagger();
  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center gap-2 text-xs">
        <span className="bg-bone/10 text-bone rounded-md px-2.5 py-1 font-semibold">{t("incidents")}</span>
        <span className="text-bone/50 px-1">{t("nationwide")}</span>
        <span className="flex-1" />
        <span className="border-status-clear/40 text-status-clear me-16 rounded-full border px-2.5 py-0.5 tabular-nums">
          {t("count")}
        </span>
      </div>
      <ul className="mt-4 flex-1 space-y-2.5 overflow-hidden">
        {FEED.map((row, i) => (
          <motion.li key={row.id} {...rise(i)} className="border-bone/10 rounded-lg border px-4 py-3">
            <div className="flex items-center justify-between">
              <Tag severity={row.severity} />
              <span className="text-bone/45 text-[11px] tabular-nums">{t("today", { time: row.when })}</span>
            </div>
            <p className="text-bone mt-2 text-sm leading-snug font-medium">{t(`rows.${row.id}`)}</p>
          </motion.li>
        ))}
      </ul>
      <p className="text-bone/40 mt-3 text-center text-[11px]">{t("page")}</p>
    </div>
  );
}

/* ---- 2 · tactical areas on the map ------------------------------------ */

// Northern Iraq — the two lit governorates and their neighbours — cropped
// and projected into the panel's coordinate space, framed close the way the
// console frames a tactical area.
const VIEW = { minLon: 41.0, maxLon: 46.8, minLat: 34.3, maxLat: 37.6 };
const LON_SCALE = Math.cos((36 * Math.PI) / 180);
const W = (VIEW.maxLon - VIEW.minLon) * LON_SCALE * 100;
const H = (VIEW.maxLat - VIEW.minLat) * 100;
const project = ([lon, lat]: LngLat): [number, number] => [
  (lon - VIEW.minLon) * LON_SCALE * 100,
  (VIEW.maxLat - lat) * 100,
];
const toPath = (ring: LngLat[]) =>
  ring.map((point, i) => `${i ? "L" : "M"}${project(point).map((n) => n.toFixed(1)).join(" ")}`).join("") + "Z";

const BORDER_PATH = toPath(iraqBorder);
const SHAPES = governorateShapes.map((shape) => ({ key: shape.key, d: shape.rings.map(toPath).join("") }));
const LIT = new Set(["DUHOK", "ERBIL"]);
const CLUSTERS: { at: LngLat; count: number; severity: Severity }[] = [
  { at: [43.0, 36.86], count: 4, severity: "elevated" },
  { at: [43.49, 37.09], count: 1, severity: "clear" },
  { at: [44.01, 36.19], count: 6, severity: "clear" },
  { at: [44.54, 36.65], count: 2, severity: "elevated" },
  { at: [42.68, 37.14], count: 1, severity: "critical" },
];

function AreasPanel() {
  const t = useTranslations("showcase.areas");
  const reduceMotion = useReducedMotion();
  const delay = (seconds: number) => (reduceMotion ? 0 : seconds);

  return (
    <div className="relative h-full">
      <div className="absolute start-4 top-4 z-10 flex gap-2 text-[11px]">
        <span className="border-bone/15 text-bone/70 rounded-full border px-2.5 py-1">{t("range")}</span>
        <span className="border-status-clear/50 text-status-clear rounded-full border px-2.5 py-1">
          {t("areas")} · 2
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W.toFixed(0)} ${H.toFixed(0)}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full px-4 pt-14 pb-4"
        aria-hidden
      >
        <path d={BORDER_PATH} fill="rgba(255,255,255,0.03)" stroke="rgba(184,154,96,0.6)" strokeWidth="2.5" />
        {SHAPES.map((shape) => (
          <motion.path
            key={shape.key}
            d={shape.d}
            stroke={LIT.has(shape.key) ? "#4ba07a" : "rgba(255,255,255,0.12)"}
            strokeWidth={LIT.has(shape.key) ? 2.5 : 1}
            initial={{ fill: "rgba(75,160,122,0)" }}
            animate={{ fill: LIT.has(shape.key) ? "rgba(75,160,122,0.3)" : "rgba(75,160,122,0)" }}
            transition={{ delay: delay(0.3), duration: delay(0.7) }}
          />
        ))}
        {CLUSTERS.map((cluster, i) => {
          const [x, y] = project(cluster.at);
          const tone = severityColor[cluster.severity];
          return (
            <motion.g
              key={i}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delay(0.6 + i * 0.12), duration: delay(0.35) }}
              style={{ transformOrigin: `${x}px ${y}px` }}
            >
              <circle cx={x} cy={y} r={cluster.count > 1 ? 15 : 9} fill={tone} opacity="0.9" />
              {cluster.count > 1 && (
                <text x={x} y={y + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="#101d2f">
                  {cluster.count}
                </text>
              )}
            </motion.g>
          );
        })}
      </svg>

      {/* An incident opened from the map. */}
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: delay(1.6), duration: delay(0.45), ease }}
        className="border-bone/14 bg-ink/95 absolute end-4 bottom-4 w-64 rounded-xl border p-4 shadow-2xl"
      >
        <p className="text-bone text-xs font-semibold">{t("cardTitle")}</p>
        <div className="mt-3 flex items-center gap-2">
          <Tag severity="elevated" />
          <span className="text-bone/55 text-[10px] tracking-wide uppercase">{t("category")}</span>
        </div>
        <p className="text-bone mt-2 text-sm leading-snug font-medium">{t("headline")}</p>
        <dl className="border-bone/10 mt-3 space-y-1 border-t pt-2 text-[11px]">
          <div className="flex justify-between gap-2">
            <dt className="text-bone/50">{t("sourceLabel")}</dt>
            <dd className="text-status-clear">{t("sourceValue")}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-bone/50">{t("infoLabel")}</dt>
            <dd className="text-status-clear">{t("infoValue")}</dd>
          </div>
        </dl>
      </motion.div>
    </div>
  );
}

/* ---- 3 · Ask Harekar --------------------------------------------------- */

function AskPanel() {
  const t = useTranslations("showcase.ask");
  const reduceMotion = useReducedMotion();
  const delay = (seconds: number) => (reduceMotion ? 0 : seconds);
  const lines = ["period", "count", "driver", "assessment"] as const;

  return (
    <div className="flex h-full flex-col p-5 pt-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay(0.15), duration: delay(0.4) }}
        className="bg-bone/10 text-bone ms-auto max-w-[85%] rounded-2xl rounded-ee-sm px-4 py-3 text-sm leading-relaxed"
      >
        {t("question")}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay(1.1), duration: delay(0.45) }}
        className="border-bone/12 mt-4 max-w-[92%] rounded-2xl rounded-es-sm border px-4 py-3"
      >
        <p className="text-gold-deep text-xs font-bold">{t("answerTitle")}</p>
        <dl className="mt-2 space-y-1.5 text-[13px]">
          {lines.map((line, i) => (
            <motion.div
              key={line}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay(1.4 + i * 0.25), duration: delay(0.3) }}
              className="flex gap-2"
            >
              <dt className="text-bone/50 shrink-0">{t(`lines.${line}.label`)}:</dt>
              <dd className="text-bone/90">{t(`lines.${line}.value`)}</dd>
            </motion.div>
          ))}
        </dl>
      </motion.div>

      <div className="flex-1" />
      <div className="border-bone/14 text-bone/40 flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
        {t("prompt")}
        <span className="bg-gold text-ink flex size-7 items-center justify-center rounded-full" aria-hidden>
          <svg viewBox="0 0 16 16" className="size-3.5 rtl:-scale-x-100" fill="none">
            <path d="M1 8h14M15 8l-6-6M15 8l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  );
}

/* ---- 4 · the Daily Security Report ------------------------------------- */

const RISK_TONE = { LOW: "#4ba07a", MODERATE: "#d9a441", HIGH: "#d97a41", CRITICAL: "#d2564b" } as const;
const MATRIX: { key: string; risk: keyof typeof RISK_TONE }[] = [
  { key: "duhok", risk: "LOW" },
  { key: "erbil", risk: "LOW" },
  { key: "ninawa", risk: "MODERATE" },
  { key: "kirkuk", risk: "HIGH" },
  { key: "baghdad", risk: "MODERATE" },
];

function ReportPanel() {
  const t = useTranslations("showcase.report");
  const rise = useStagger();
  return (
    <div className="flex h-full items-center justify-center p-6 pt-10">
      <div className="h-full w-full max-w-md overflow-hidden rounded-lg bg-white p-6 text-[#101d2f] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#101d2f]/10 pb-3">
          <div>
            <p className="text-[10px] font-bold tracking-wide text-[#7d6637]">{t("brand")}</p>
            <p className="mt-1 text-base font-bold">{t("title")}</p>
          </div>
          <span className="rounded-full bg-[#b89a60] px-3 py-1 text-[11px] font-bold text-[#101d2f]">{t("download")}</span>
        </div>

        <p className="mt-4 text-xs font-bold">{t("summary")}</p>
        <div className="mt-2 space-y-1.5" aria-hidden>
          {[92, 100, 78].map((width, i) => (
            <motion.div key={i} {...rise(i, 0.1)} className="h-1.5 rounded-full bg-[#101d2f]/10" style={{ width: `${width}%` }} />
          ))}
        </div>

        <p className="mt-5 text-xs font-bold">{t("matrix")}</p>
        <ul className="mt-2 space-y-1.5">
          {MATRIX.map((row, i) => (
            <motion.li key={row.key} {...rise(i, 0.4)} className="flex items-center justify-between text-[13px]">
              <span>{t(`places.${row.key}`)}</span>
              <span
                className="rounded px-2 py-0.5 text-[11px] font-bold text-white"
                style={{ background: RISK_TONE[row.risk] }}
              >
                {t(`risk.${row.risk}`)}
              </span>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
