"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  EVENT_SEVERITIES,
  GOVERNORATES,
  REPORT_CATEGORIES,
  THREAT_LEVELS,
  type ConsoleReport,
  type ReportNewsItem,
} from "@/lib/report-shape";
import { categoryColor, joinPlace } from "@/lib/pdf/report-labels";
import { orderReportEvents } from "@/lib/report-order";
import ReportEventMap from "@/components/portal/ReportEventMap";
import Reveal from "@/components/Reveal";
import {
  ByGovernorate,
  EventTypes,
  SeverityCounters,
  ThreatIntensity,
  TopIncidents,
  TrendVelocity,
} from "@/components/portal/BriefAnalytics";
import type { DatedEvent } from "@/lib/portal/reports";
import { formatDate } from "@/lib/portal/format";
import { cn } from "@/lib/utils";

type Tab = "brief" | "logs" | "reports";

const threatTone: Record<
  ConsoleReport["iraqThreat"],
  { color: string; opacity: string }
> = {
  LOW: { color: "var(--color-status-clear)", opacity: "1" },
  MODERATE: { color: "var(--color-status-clear)", opacity: "0.7" },
  HIGH: { color: "var(--color-status-elevated)", opacity: "1" },
  CRITICAL: { color: "var(--color-status-critical)", opacity: "1" },
};

/**
 * The portal's Reports station: today's Daily Brief, the chronological
 * Briefing Log, and the full Reports table with PDF downloads — the same
 * three tabs Conterra's own "Reports" screen carries, all reading from the
 * one list of saved Daily Security Reports the console already files.
 */
export default function ReportsStation({
  name,
  latestBrief,
  recentBriefs,
  trendEvents,
}: {
  name: string;
  latestBrief: ConsoleReport | null;
  recentBriefs: ConsoleReport[];
  /** Report events from the 14 days ending on the latest brief's day. */
  trendEvents: DatedEvent[];
}) {
  const t = useTranslations("portal.reports");
  const [tab, setTab] = useState<Tab>("brief");
  const [filters, setFilters] = useState<ReportFilterState>(NO_FILTERS);
  const filteredBriefs = useMemo(() => applyReportFilters(recentBriefs, filters), [recentBriefs, filters]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "brief", label: t("tabBrief") },
    { id: "logs", label: t("tabLogs") },
    { id: "reports", label: t("tabReports") },
  ];

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-bone text-3xl font-light">
          {t("title")}
        </h1>
        <p className="text-bone/55 mt-2 max-w-2xl text-sm leading-relaxed">
          {t("intro")}
        </p>
      </header>

      <div role="tablist" aria-label={t("title")} className="mb-6 flex flex-wrap gap-2">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "flex min-h-11 cursor-pointer items-center rounded-full border px-5 text-sm transition-colors",
              tab === id
                ? "border-gold/60 bg-gold/12 text-gold-deep"
                : "border-bone/16 text-bone/70 hover:border-bone/35 hover:text-bone",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "brief" &&
        (latestBrief ? (
          <div className="space-y-6">
            {/* Conterra's brief layout: the write-up beside a column holding
                the day's event map and its severity counts, the analytics
                underneath. */}
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
              <DailyBrief report={latestBrief} name={name} />
              <aside className="space-y-4 xl:sticky xl:top-6" aria-label={t("mapLabel")}>
                <ReportEventMap items={latestBrief.content.items} compact />
                <SeverityCounters items={latestBrief.content.items} />
              </aside>
            </div>
            {/* Each block fades up as it scrolls in, as on the public site. */}
            <Reveal>
              <TrendVelocity events={trendEvents} endDate={latestBrief.date} />
            </Reveal>
            <Reveal>
              <TopIncidents items={latestBrief.content.items} />
            </Reveal>
            <div className="grid gap-6 lg:grid-cols-3">
              <Reveal>
                <ByGovernorate items={latestBrief.content.items} />
              </Reveal>
              <Reveal delay={0.08}>
                <ThreatIntensity items={latestBrief.content.items} />
              </Reveal>
              <Reveal delay={0.16}>
                <EventTypes items={latestBrief.content.items} />
              </Reveal>
            </div>
          </div>
        ) : (
          <EmptyState message={t("noBriefYet")} />
        ))}

      {tab !== "brief" && (
        <ReportFilters reports={recentBriefs} filters={filters} onChange={setFilters} count={filteredBriefs.length} />
      )}

      {tab === "logs" && <BriefingLogs reports={filteredBriefs} />}

      {tab === "reports" && <ReportsTable reports={filteredBriefs} />}
    </div>
  );
}

/** "Good morning" / afternoon / evening, resolved from the visitor's own
 * clock after mount — never on the server, which knows only its own time
 * zone and would greet a Duhok client with a Virginia data centre's hour. */
function useGreeting() {
  const t = useTranslations("portal.reports");
  const [period, setPeriod] = useState<"morning" | "afternoon" | "evening" | null>(
    null,
  );

  useEffect(() => {
    // Deferred so the initial detection never sets state synchronously
    // within the effect body itself — the same pattern the hero's own
    // pointer-fine detection uses, for the same reason.
    queueMicrotask(() => {
      const hour = new Date().getHours();
      setPeriod(hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening");
    });
  }, []);

  // Neutral on the server and for the first client render, so hydration
  // never has to reconcile two different greetings.
  return period ? t(`greeting.${period}`) : t("greeting.neutral");
}

function DailyBrief({
  report,
  name,
  compact = false,
}: {
  report: ConsoleReport;
  name: string;
  /** Used inline under Briefing Logs, where a report is one entry among many
   * rather than "today" — no greeting, no share/download chrome, just the
   * summary and the incidents. */
  compact?: boolean;
}) {
  const t = useTranslations("portal.reports");
  const locale = useLocale();
  const greeting = useGreeting();

  const summary =
    report.executiveSummary?.trim() ||
    t("summaryFallback", { count: report.content.items.length });

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: t("title"), url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url).catch(() => {});
  }

  return (
    <article
      className={
        compact
          ? ""
          : "border-bone/14 bg-surface/20 rounded-3xl border p-6 sm:p-8"
      }
    >
      {!compact && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="border-gold/35 bg-gold/10 text-gold-deep flex size-11 shrink-0 items-center justify-center rounded-full border">
              <svg viewBox="0 0 20 20" className="size-5" fill="none" aria-hidden>
                <path d="m2.5 4.5 7.5 5.5 7.5-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </span>
            <div>
              <h2 className="font-display text-bone text-xl">
                {greeting}, {name}
              </h2>
              <p className="text-bone/55 mt-1 text-sm">
                {t("subtitle", {
                  date: formatDate(new Date(report.date), locale, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  }),
                })}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={handleShare}
              aria-label={t("share")}
              title={t("share")}
              className="border-bone/20 text-bone/70 hover:border-gold hover:text-gold-deep flex size-10 cursor-pointer items-center justify-center rounded-full border transition-colors"
            >
              <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden>
                <circle cx="15" cy="5" r="2" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="5" cy="10" r="2" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="15" cy="15" r="2" stroke="currentColor" strokeWidth="1.4" />
                <path d="m6.7 9 6.6-3.1M6.7 11l6.6 3.1" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </button>
            <PdfLinks reportId={report.id} />
          </div>
        </div>
      )}

      {!compact && (
        <p className="text-gold-deep/70 mt-5 text-xs tracking-[0.14em] uppercase">
          {t("snapshotGenerated", {
            date: formatDate(new Date(report.updatedAt), locale, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
          })}
        </p>
      )}

      <h3 className={cn("text-gold-deep/85 text-xs font-medium tracking-[0.16em] uppercase", compact ? "" : "mt-6")}>
        {t("executiveSummary")}
      </h3>
      <p className="text-bone/80 mt-2 text-sm leading-relaxed text-pretty">
        {summary}
      </p>

      <ReportBody items={report.content.items} />
    </article>
  );
}

function BriefingLogs({ reports }: { reports: ConsoleReport[] }) {
  const t = useTranslations("portal.reports");
  const locale = useLocale();
  const [openId, setOpenId] = useState<string | null>(null);

  if (reports.length === 0) return <EmptyState message={t("noBriefYet")} />;

  return (
    <ul className="border-bone/14 divide-bone/10 divide-y rounded-2xl border">
      {reports.map((report) => {
        const open = openId === report.id;
        return (
          <li key={report.id}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : report.id)}
              aria-expanded={open}
              className="hover:bg-bone/[0.03] flex min-h-14 w-full cursor-pointer items-center gap-4 px-5 py-3 text-start transition-colors"
            >
              <svg
                viewBox="0 0 20 20"
                className={cn("text-gold-deep/70 size-3.5 shrink-0 transition-transform", open && "rotate-90 rtl:-rotate-90")}
                fill="none"
                aria-hidden
              >
                <path d="m7.5 4.5 5.5 5.5-5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-bone min-w-0 flex-1 truncate text-sm">
                {formatDate(new Date(report.date), locale, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <ThreatDot level={report.iraqThreat} />
              <span className="text-bone/55 shrink-0 text-xs tabular-nums">
                {t("itemCount", { count: report.content.items.length })}
              </span>
            </button>

            {open && (
              <div className="border-bone/10 border-t px-5 py-5">
                <DailyBrief report={report} name="" compact />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ReportsTable({ reports }: { reports: ConsoleReport[] }) {
  const t = useTranslations("portal.reports");
  const locale = useLocale();

  if (reports.length === 0) return <EmptyState message={t("noBriefYet")} />;

  return (
    <div className="border-bone/14 overflow-hidden rounded-2xl border">
      <ul className="divide-bone/10 divide-y">
        {reports.map((report) => (
          <li key={report.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
            <span className="text-bone min-w-[9rem] flex-1 text-sm">
              {formatDate(new Date(report.date), locale, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span className="flex items-center gap-2 text-xs">
              <ThreatDot level={report.kurdistanThreat} />
              <span className="text-bone/55">{t("kurdistan")}</span>
            </span>
            <span className="flex items-center gap-2 text-xs">
              <ThreatDot level={report.iraqThreat} />
              <span className="text-bone/55">{t("iraq")}</span>
            </span>
            <span className="text-bone/50 shrink-0 text-xs tabular-nums">
              {t("itemCount", { count: report.content.items.length })}
            </span>
            <PdfLinks reportId={report.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The report's two PDF versions: identical content, with and without source links. */
function PdfLinks({ reportId }: { reportId: string }) {
  const v = useTranslations("reportVocab");
  const link =
    "border-gold/40 text-gold-deep hover:bg-gold hover:text-ink flex min-h-9 shrink-0 items-center rounded-full border px-4 text-xs transition-colors";
  return (
    <span className="flex flex-wrap gap-2">
      <a href={`/api/portal/reports/${reportId}/pdf`} className={link}>
        {v("pdfWithSources")}
      </a>
      <a href={`/api/portal/reports/${reportId}/pdf?sources=0`} className={link}>
        {v("pdfWithoutSources")}
      </a>
    </span>
  );
}

/**
 * The report's events as the PDF orders them: the Kurdistan short summaries,
 * then the five sections in turn (Kurdistan first within each), then anything
 * filed before sections existed. Numbers match the event map and the PDF.
 */
function ReportBody({ items }: { items: ReportNewsItem[] }) {
  const v = useTranslations("reportVocab");
  const { sections, numbered } = orderReportEvents(items);
  const kurdistan = numbered.filter(({ item }) => item.region === "KURDISTAN");

  const place = (item: ReportNewsItem) =>
    joinPlace([
      item.area,
      item.district,
      item.governorate ? v(`governorates.${item.governorate}`) : null,
    ]);

  return (
    <>
      {kurdistan.length > 0 && (
        <>
          <h3 className="text-gold-deep/85 mt-7 text-xs font-medium tracking-[0.16em] uppercase">
            {v("shortSummaries")}
          </h3>
          <ul className="mt-3 space-y-2">
            {kurdistan.map(({ item, number }) => (
              <li key={number} className="flex gap-3 text-sm leading-relaxed">
                <span aria-hidden className="bg-gold/60 mt-2 size-1.5 shrink-0 rounded-full" />
                <p className="text-bone/75">{item.shortSummary?.trim() || item.title}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {sections.map(({ category, events }) => (
        <section key={category ?? "general"}>
          <h3 className="mt-7 flex items-center gap-2 text-xs font-medium tracking-[0.16em] uppercase">
            <span
              aria-hidden
              className="inline-block size-2.5 rounded-full"
              style={{ background: categoryColor(category) }}
            />
            <span className="text-gold-deep/85">
              {category ? v(`categories.${category}`) : v("uncategorised")}
            </span>
          </h3>
          <ul className="mt-3 space-y-4">
            {events.map(({ item, number }) => {
              const where = place(item);
              const kind = item.classification ? v(`classifications.${item.classification}`) : "";
              return (
                <li key={number} className="flex gap-3 text-sm leading-relaxed">
                  <span
                    className="mt-0.5 flex h-5 min-w-5 shrink-0 items-center justify-center rounded px-1 text-[11px] font-semibold text-white tabular-nums"
                    style={{ background: categoryColor(item.category) }}
                  >
                    {number}
                  </span>
                  <div className="min-w-0">
                    <p className="text-bone font-medium">{item.title}</p>
                    {(where || kind) && (
                      <p className="text-bone/50 mt-0.5 text-xs">
                        {[where, kind].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <p className="text-bone/70 mt-1">{item.body}</p>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        dir="ltr"
                        className="text-gold-deep/70 hover:text-gold-deep mt-1 block truncate text-xs"
                      >
                        {item.url}
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}

function ThreatDot({ level }: { level: ConsoleReport["iraqThreat"] }) {
  const tone = threatTone[level];
  return (
    <span
      aria-hidden
      className="inline-block size-2 rounded-full"
      style={{ background: tone.color, opacity: tone.opacity }}
    />
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="border-bone/14 text-bone/50 rounded-2xl border border-dashed px-6 py-14 text-center text-sm">
      {message}
    </p>
  );
}

/* ---- report filters --------------------------------------------------------- */

type ReportFilterState = {
  query: string;
  from: string;
  to: string;
  kurdistanThreat: string;
  iraqThreat: string;
  category: string;
  severity: string;
  governorate: string;
};

const NO_FILTERS: ReportFilterState = {
  query: "",
  from: "",
  to: "",
  kurdistanThreat: "",
  iraqThreat: "",
  category: "",
  severity: "",
  governorate: "",
};

/**
 * Narrows the report archive. Report-level filters (date, the two threat
 * levels) test the report itself; event-level ones (text, section, severity,
 * governorate) keep a report when at least one of its events matches, since
 * a reader looking for "Kirkuk" wants every report that mentions Kirkuk.
 */
function applyReportFilters(reports: ConsoleReport[], f: ReportFilterState): ConsoleReport[] {
  const query = f.query.trim().toLowerCase();
  return reports.filter((report) => {
    const day = report.date.slice(0, 10);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    if (f.kurdistanThreat && report.kurdistanThreat !== f.kurdistanThreat) return false;
    if (f.iraqThreat && report.iraqThreat !== f.iraqThreat) return false;
    const items = report.content.items;
    if (f.category && !items.some((item) => item.category === f.category)) return false;
    if (f.severity && !items.some((item) => item.severity === f.severity)) return false;
    if (f.governorate && !items.some((item) => item.governorate === f.governorate)) return false;
    if (query) {
      const text = [
        report.executiveSummary,
        ...items.flatMap((item) => [item.title, item.body, item.shortSummary, item.area, item.district]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!text.includes(query)) return false;
    }
    return true;
  });
}

function ReportFilters({
  reports,
  filters,
  onChange,
  count,
}: {
  reports: ConsoleReport[];
  filters: ReportFilterState;
  onChange: (next: ReportFilterState) => void;
  count: number;
}) {
  const v = useTranslations("reportVocab");
  const set = (patch: Partial<ReportFilterState>) => onChange({ ...filters, ...patch });
  const active = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
  // Only governorates that actually appear in the archive are offered.
  const governorates = GOVERNORATES.map((g) => g.key).filter((key) =>
    reports.some((report) => report.content.items.some((item) => item.governorate === key)),
  );
  const control =
    "border-bone/16 bg-white text-bone focus:border-gold min-h-11 w-full cursor-pointer rounded-xl border px-3 text-sm outline-none";
  const label = "text-bone/55 mb-1 block text-[11px] tracking-[0.14em] uppercase";

  return (
    <section aria-label={v("filters.title")} className="border-bone/14 bg-surface/40 mb-6 space-y-3 rounded-2xl border p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="sm:col-span-2">
          <span className={label}>{v("filters.search")}</span>
          <input
            type="search"
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
            placeholder={v("filters.searchPlaceholder")}
            className={`${control} cursor-text`}
          />
        </label>
        <label>
          <span className={label}>{v("filters.from")}</span>
          <input type="date" value={filters.from} onChange={(e) => set({ from: e.target.value })} className={control} />
        </label>
        <label>
          <span className={label}>{v("filters.to")}</span>
          <input type="date" value={filters.to} onChange={(e) => set({ to: e.target.value })} className={control} />
        </label>
        <label>
          <span className={label}>{v("filters.kurdistanThreat")}</span>
          <select value={filters.kurdistanThreat} onChange={(e) => set({ kurdistanThreat: e.target.value })} className={control}>
            <option value="">{v("filters.any")}</option>
            {THREAT_LEVELS.map((level) => (
              <option key={level} value={level}>
                {v(`threatLevels.${level}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={label}>{v("filters.iraqThreat")}</span>
          <select value={filters.iraqThreat} onChange={(e) => set({ iraqThreat: e.target.value })} className={control}>
            <option value="">{v("filters.any")}</option>
            {THREAT_LEVELS.map((level) => (
              <option key={level} value={level}>
                {v(`threatLevels.${level}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={label}>{v("filters.section")}</span>
          <select value={filters.category} onChange={(e) => set({ category: e.target.value })} className={control}>
            <option value="">{v("filters.any")}</option>
            {REPORT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {v(`categories.${category}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={label}>{v("filters.severity")}</span>
          <select value={filters.severity} onChange={(e) => set({ severity: e.target.value })} className={control}>
            <option value="">{v("filters.any")}</option>
            {EVENT_SEVERITIES.map((level) => (
              <option key={level} value={level}>
                {v(`severities.${level}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={label}>{v("filters.governorate")}</span>
          <select value={filters.governorate} onChange={(e) => set({ governorate: e.target.value })} className={control}>
            <option value="">{v("filters.any")}</option>
            {governorates.map((key) => (
              <option key={key} value={key}>
                {v(`governorates.${key}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-bone/60 text-xs tabular-nums">{v("filters.count", { count })}</span>
        {active && (
          <button
            type="button"
            onClick={() => onChange(NO_FILTERS)}
            className="text-gold-deep hover:text-gold-deep cursor-pointer text-xs underline-offset-4 hover:underline"
          >
            {v("filters.reset")}
          </button>
        )}
      </div>
    </section>
  );
}
