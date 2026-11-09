"use client";

import type { CSSProperties, ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  EVENT_SEVERITIES,
  REPORT_CATEGORIES,
  type EventSeverity,
  type ReportCategory,
  type ReportNewsItem,
} from "@/lib/report-shape";
import { categoryColorDark, joinPlace } from "@/lib/pdf/report-labels";
import { formatDate } from "@/lib/portal/format";
import type { DatedEvent } from "@/lib/portal/reports";

/**
 * The Daily Brief's analytics, built from report events: severity counters,
 * the 14-day trend, the top five incidents and three breakdowns.
 *
 * Charts follow the dataviz method: thin bars, 2px gaps between stacked
 * segments, counts printed beside every bar (so nothing is read from colour
 * alone), a legend wherever there is more than one series, and a hover note
 * on each mark. Severity uses the site's reserved status colours, always with
 * its label; sections use the validated categorical palette.
 */

const SEVERITY_COLOR: Record<EventSeverity, string> = {
  HIGH: "var(--color-status-critical)",
  MEDIUM: "var(--color-status-elevated)",
  LOW: "var(--color-status-clear)",
};
/** Highest first: the order counters, stacks and legends read in. */
const SEVERITY_ORDER: EventSeverity[] = ["HIGH", "MEDIUM", "LOW"];
/** Events with no severity set: a quiet neutral, never a status colour. */
const UNRATED_TONE = "color-mix(in oklab, var(--color-bone) 35%, transparent)";
/** Last week's totals: one neutral, so only this week carries severity colour. */
const LAST_WEEK_TONE = "color-mix(in oklab, var(--color-bone) 22%, transparent)";

function severityRank(item: ReportNewsItem): number {
  return item.severity ? 3 - SEVERITY_ORDER.indexOf(item.severity) : 0;
}

/* ---- shared pieces ------------------------------------------------------ */

function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-bone/14 bg-surface/20 rounded-2xl border p-5 ${className}`}>
      <h3 className="text-bone text-sm font-medium tracking-[0.08em] uppercase">{title}</h3>
      {subtitle && (
        <p className="text-gold/70 mt-1 text-[11px] tracking-[0.14em] uppercase">{subtitle}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** A mark with a hover/focus note — the tooltip layer every chart carries. */
function Tip({
  note,
  children,
  className = "",
  style,
}: {
  note: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span tabIndex={0} aria-label={note} style={style} className={`group/tip relative outline-none ${className}`}>
      {children}
      <span
        role="tooltip"
        className="bg-ink border-bone/20 text-bone pointer-events-none absolute bottom-full start-1/2 z-10 mb-1.5 hidden -translate-x-1/2 rounded-md border px-2 py-1 text-[11px] whitespace-nowrap shadow-lg group-hover/tip:block group-focus/tip:block rtl:translate-x-1/2"
      >
        {note}
      </span>
    </span>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map(({ label, color }) => (
        <li key={label} className="text-bone/60 flex items-center gap-1.5 text-[11px]">
          <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: color }} />
          {label}
        </li>
      ))}
    </ul>
  );
}

function Empty() {
  const v = useTranslations("reportVocab");
  return <p className="text-bone/45 py-6 text-center text-xs">{v("analytics.noEvents")}</p>;
}

/* ---- severity counters (right column) ------------------------------------ */

export function SeverityCounters({ items }: { items: ReportNewsItem[] }) {
  const v = useTranslations("reportVocab");
  return (
    <div className="space-y-3">
      {SEVERITY_ORDER.map((level) => {
        const count = items.filter((item) => item.severity === level).length;
        return (
          <div
            key={level}
            className="border-bone/14 bg-surface/20 flex items-center justify-between rounded-2xl border px-5 py-4"
          >
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] uppercase" style={{ color: SEVERITY_COLOR[level] }}>
                {v(`severities.${level}`)}
              </p>
              <p className="text-bone/50 mt-0.5 text-xs">
                {count === 0 ? v("analytics.noneToday") : v("analytics.eventsToday", { count })}
              </p>
            </div>
            <span className="text-bone font-display text-4xl font-light tabular-nums">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---- trend velocity ------------------------------------------------------ */

function lastNDays(end: string, n: number): string[] {
  const days: string[] = [];
  const cursor = new Date(`${end}T00:00:00Z`);
  for (let i = n - 1; i >= 0; i--) {
    const day = new Date(cursor);
    day.setUTCDate(cursor.getUTCDate() - i);
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

export function TrendVelocity({ events, endDate }: { events: DatedEvent[]; endDate: string }) {
  const v = useTranslations("reportVocab");
  const locale = useLocale();
  const days = lastNDays(endDate.slice(0, 10), 14);
  const lastWeek = days.slice(0, 7);
  const thisWeek = days.slice(7);
  const onDay = (day: string) => events.filter((event) => event.date === day);

  const lastTotal = lastWeek.reduce((sum, day) => sum + onDay(day).length, 0);
  const thisTotal = thisWeek.reduce((sum, day) => sum + onDay(day).length, 0);
  const max = Math.max(1, ...days.map((day) => onDay(day).length));
  const change =
    lastTotal === 0 ? null : Math.round(((thisTotal - lastTotal) / lastTotal) * 100);

  const dayLabel = (day: string) =>
    formatDate(new Date(`${day}T00:00:00Z`), locale, { weekday: "short", day: "numeric", timeZone: "UTC" });

  const week = (weekDays: string[], stacked: boolean) => (
    <>
      <div className="flex h-40 items-end gap-2">
        {weekDays.map((day) => {
          const dayEvents = onDay(day);
          // Up to 85% of the column, leaving room for the count above the bar.
          const height = (dayEvents.length / max) * 85;
          const segments = stacked
            ? ([...SEVERITY_ORDER, null] as (EventSeverity | null)[])
                .map((level) => ({
                  level,
                  count: dayEvents.filter((event) => (event.severity ?? null) === level).length,
                }))
                .filter((segment) => segment.count > 0)
            : [{ level: "TOTAL" as const, count: dayEvents.length }];
          return (
            <div key={day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="text-bone/70 text-[11px] tabular-nums">{dayEvents.length || ""}</span>
              {dayEvents.length === 0 ? (
                <span className="bg-bone/10 block h-[3px] w-full max-w-9 rounded-t-[4px]" />
              ) : (
                <Tip
                  note={`${dayLabel(day)}: ${v("analytics.eventCount", { count: dayEvents.length })}`}
                  className="flex w-full max-w-9 flex-col-reverse gap-[2px]"
                  style={{ height: `${Math.max(height, 4)}%` }}
                >
                  {segments.map((segment, i) => (
                    <span
                      key={String(segment.level)}
                      className={`block w-full ${i === segments.length - 1 ? "rounded-t-[4px]" : ""}`}
                      style={{
                        flexGrow: segment.count,
                        flexBasis: 0,
                        background:
                          segment.level === "TOTAL"
                            ? LAST_WEEK_TONE
                            : segment.level
                              ? SEVERITY_COLOR[segment.level]
                              : UNRATED_TONE,
                      }}
                    />
                  ))}
                </Tip>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-2">
        {weekDays.map((day) => (
          <span key={day} className="text-bone/45 min-w-0 flex-1 truncate text-center text-[10px]">
            {dayLabel(day)}
          </span>
        ))}
      </div>
    </>
  );

  return (
    <Panel title={v("analytics.trendTitle")} subtitle={v("analytics.trendSubtitle")}>
      <div className="mb-4 flex justify-end">
        {change !== null && (
          <span
            className="rounded-full border px-3 py-1 text-xs tabular-nums"
            style={{
              borderColor: change > 0 ? "var(--color-status-critical)" : "var(--color-status-clear)",
              color: change > 0 ? "var(--color-status-critical)" : "var(--color-status-clear)",
            }}
          >
            {change > 0 ? "↑" : change < 0 ? "↓" : "→"} {Math.abs(change)}% {v("analytics.vsLastWeek")}
          </span>
        )}
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <p className="text-bone/55 mb-2 text-center text-[11px] tracking-[0.14em] uppercase">
            {v("analytics.lastWeek")} · {v("analytics.eventCount", { count: lastTotal })}
          </p>
          {week(lastWeek, false)}
        </div>
        <div>
          <p className="text-bone/55 mb-2 text-center text-[11px] tracking-[0.14em] uppercase">
            {v("analytics.thisWeek")} · {v("analytics.eventCount", { count: thisTotal })}
          </p>
          {week(thisWeek, true)}
        </div>
      </div>
      <Legend
        items={[
          { label: v("analytics.lastWeekTotal"), color: LAST_WEEK_TONE },
          ...SEVERITY_ORDER.map((level) => ({ label: v(`severities.${level}`), color: SEVERITY_COLOR[level] })),
          { label: v("analytics.unrated"), color: UNRATED_TONE },
        ]}
      />
    </Panel>
  );
}

/* ---- top incidents -------------------------------------------------------- */

export function TopIncidents({ items }: { items: ReportNewsItem[] }) {
  const v = useTranslations("reportVocab");
  // Most serious first; the report's own order breaks ties.
  const top = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => severityRank(b.item) - severityRank(a.item) || a.index - b.index)
    .slice(0, 5)
    .map(({ item }) => item);

  return (
    <Panel title={v("analytics.topTitle")}>
      {top.length === 0 ? (
        <Empty />
      ) : (
        <ol className="space-y-3">
          {top.map((item, i) => {
            const tone = item.severity ? SEVERITY_COLOR[item.severity] : "var(--color-bone)";
            const where = joinPlace([
              item.area,
              item.governorate ? v(`governorates.${item.governorate}`) : null,
            ]);
            return (
              <li
                key={i}
                className="bg-ink/40 rounded-xl border-s-4 px-4 py-3"
                style={{ borderInlineStartColor: tone }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-bone text-sm font-medium">{item.title}</p>
                  {item.severity && (
                    <span
                      className="shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] uppercase"
                      style={{ borderColor: tone, color: tone }}
                    >
                      {v(`severities.${item.severity}`)}
                    </span>
                  )}
                </div>
                <p className="text-bone/65 mt-1.5 text-xs leading-relaxed">
                  <span className="text-bone/85 font-medium">{v("analytics.whatHappened")} </span>
                  {item.shortSummary?.trim() || item.body}
                </p>
                {(where || item.category) && (
                  <p className="text-bone/45 mt-1 text-[11px]">
                    {[where, item.category ? v(`categories.${item.category}`) : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

/* ---- breakdowns ----------------------------------------------------------- */

type Segment = { key: string; label: string; color: string; count: number };

/** One row of a horizontal stacked bar chart: label, segments, total. */
function StackedRow({ label, segments, max }: { label: string; segments: Segment[]; max: number }) {
  const visible = segments.filter((segment) => segment.count > 0);
  const total = visible.reduce((sum, segment) => sum + segment.count, 0);
  return (
    <div className="flex items-center gap-3">
      <span className="text-bone/70 w-24 shrink-0 truncate text-end text-xs">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="flex h-3 gap-[2px]" style={{ width: `${(total / max) * 88}%` }}>
          {visible.map((segment, i) => (
            <Tip
              key={segment.key}
              note={`${label} · ${segment.label}: ${segment.count}`}
              className="block h-full"
              style={{ flexGrow: segment.count, flexBasis: 0 }}
            >
              <span
                className={`block h-full w-full ${i === visible.length - 1 ? "rounded-e-[4px]" : ""}`}
                style={{ background: segment.color }}
              />
            </Tip>
          ))}
        </div>
        <span className="text-bone/70 shrink-0 text-xs tabular-nums">{total}</span>
      </div>
    </div>
  );
}

function governorateRows(items: ReportNewsItem[], label: (key: string) => string) {
  const groups = new Map<string, ReportNewsItem[]>();
  for (const item of items) {
    const key = item.governorate ?? "NATIONWIDE";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()]
    .map(([key, rows]) => ({ key, label: label(key), rows }))
    .sort((a, b) => b.rows.length - a.rows.length);
}

export function ByGovernorate({ items }: { items: ReportNewsItem[] }) {
  const v = useTranslations("reportVocab");
  const rows = governorateRows(items, (key) =>
    key === "NATIONWIDE" ? v("analytics.nationwide") : v(`governorates.${key}`),
  );
  const max = Math.max(1, ...rows.map((row) => row.rows.length));
  const sections = [...REPORT_CATEGORIES, null] as (ReportCategory | null)[];
  const shown = sections.filter((category) => items.some((item) => (item.category ?? null) === category));

  return (
    <Panel title={v("analytics.byRegionTitle")} subtitle={v("analytics.byRegionSubtitle")}>
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <>
          <div className="space-y-2.5">
            {rows.map((row) => (
              <StackedRow
                key={row.key}
                label={row.label}
                max={max}
                segments={sections.map((category) => ({
                  key: category ?? "none",
                  label: category ? v(`categories.${category}`) : v("uncategorised"),
                  color: categoryColorDark(category),
                  count: row.rows.filter((item) => (item.category ?? null) === category).length,
                }))}
              />
            ))}
          </div>
          <Legend
            items={shown.map((category) => ({
              label: category ? v(`categories.${category}`) : v("uncategorised"),
              color: categoryColorDark(category),
            }))}
          />
        </>
      )}
    </Panel>
  );
}

export function ThreatIntensity({ items }: { items: ReportNewsItem[] }) {
  const v = useTranslations("reportVocab");
  const rows = governorateRows(items, (key) =>
    key === "NATIONWIDE" ? v("analytics.nationwide") : v(`governorates.${key}`),
  );
  const max = Math.max(1, ...rows.map((row) => row.rows.length));

  return (
    <Panel title={v("analytics.intensityTitle")} subtitle={v("analytics.intensitySubtitle")}>
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <>
          <div className="space-y-2.5">
            {rows.map((row) => (
              <StackedRow
                key={row.key}
                label={row.label}
                max={max}
                segments={[
                  ...SEVERITY_ORDER.map((level) => ({
                    key: level,
                    label: v(`severities.${level}`),
                    color: SEVERITY_COLOR[level],
                    count: row.rows.filter((item) => item.severity === level).length,
                  })),
                  {
                    key: "unrated",
                    label: v("analytics.unrated"),
                    color: UNRATED_TONE,
                    count: row.rows.filter((item) => !item.severity).length,
                  },
                ]}
              />
            ))}
          </div>
          <Legend
            items={[
              ...EVENT_SEVERITIES.slice()
                .reverse()
                .map((level) => ({ label: v(`severities.${level}`), color: SEVERITY_COLOR[level] })),
              { label: v("analytics.unrated"), color: UNRATED_TONE },
            ]}
          />
        </>
      )}
    </Panel>
  );
}

/**
 * Event types as ranked bars in one hue. Conterra draws this as a donut; with
 * up to twelve types a donut cannot be read, so the counts are ranked instead.
 */
export function EventTypes({ items }: { items: ReportNewsItem[] }) {
  const v = useTranslations("reportVocab");
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = item.classification ?? "UNSPECIFIED";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map(([, count]) => count));

  return (
    <Panel title={v("analytics.typesTitle")} subtitle={v("analytics.typesSubtitle")}>
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <div className="space-y-2.5">
          {rows.map(([key, count]) => {
            const label = key === "UNSPECIFIED" ? v("analytics.unspecified") : v(`classifications.${key}`);
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-bone/70 w-28 shrink-0 truncate text-end text-xs">{label}</span>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Tip
                    note={`${label}: ${count}`}
                    className="block h-3"
                    style={{ width: `${Math.max((count / max) * 88, 3)}%` }}
                  >
                    <span className="bg-gold block h-3 w-full rounded-e-[4px]" />
                  </Tip>
                  <span className="text-bone/70 shrink-0 text-xs tabular-nums">{count}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
