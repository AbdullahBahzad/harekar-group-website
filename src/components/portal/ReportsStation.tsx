"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ConsoleReport, ReportNewsItem } from "@/lib/report-shape";
import { categoryColor, joinPlace } from "@/lib/pdf/report-labels";
import { orderReportEvents } from "@/lib/report-order";
import ReportEventMap from "@/components/portal/ReportEventMap";
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
  map,
}: {
  name: string;
  latestBrief: ConsoleReport | null;
  recentBriefs: ConsoleReport[];
  /** The interactive Iraq map, rendered by the server page — kept as a prop
   * rather than fetched here so this stays a plain client component with no
   * server-only imports of its own. */
  map: ReactNode;
}) {
  const t = useTranslations("portal.reports");
  const [tab, setTab] = useState<Tab>("brief");

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
                ? "border-gold/60 bg-gold/12 text-gold"
                : "border-bone/16 text-bone/70 hover:border-bone/35 hover:text-bone",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "brief" &&
        (latestBrief ? (
          <div className="space-y-8">
            <DailyBrief report={latestBrief} name={name} />
            <section aria-label={t("mapLabel")}>{map}</section>
          </div>
        ) : (
          <EmptyState message={t("noBriefYet")} />
        ))}

      {tab === "logs" && <BriefingLogs reports={recentBriefs} />}

      {tab === "reports" && <ReportsTable reports={recentBriefs} />}
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

  const v = useTranslations("reportVocab");
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
            <span className="border-gold/35 bg-gold/10 text-gold flex size-11 shrink-0 items-center justify-center rounded-full border">
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
              className="border-bone/20 text-bone/70 hover:border-gold hover:text-gold flex size-10 cursor-pointer items-center justify-center rounded-full border transition-colors"
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
        <p className="text-gold/70 mt-5 text-xs tracking-[0.14em] uppercase">
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

      <h3 className={cn("text-gold/85 text-xs font-medium tracking-[0.16em] uppercase", compact ? "" : "mt-6")}>
        {t("executiveSummary")}
      </h3>
      <p className="text-bone/80 mt-2 text-sm leading-relaxed text-pretty">
        {summary}
      </p>

      <ReportBody items={report.content.items} />

      {!compact && report.content.items.length > 0 && (
        <section className="mt-8">
          <h3 className="text-gold/85 mb-3 text-xs font-medium tracking-[0.16em] uppercase">
            {v("eventMap")}
          </h3>
          <ReportEventMap items={report.content.items} />
        </section>
      )}
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
                className={cn("text-gold/70 size-3.5 shrink-0 transition-transform", open && "rotate-90 rtl:-rotate-90")}
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
    "border-gold/40 text-gold hover:bg-gold hover:text-ink flex min-h-9 shrink-0 items-center rounded-full border px-4 text-xs transition-colors";
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
          <h3 className="text-gold/85 mt-7 text-xs font-medium tracking-[0.16em] uppercase">
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
            <span className="text-gold/85">
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
                        className="text-gold/70 hover:text-gold mt-1 block truncate text-xs"
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
