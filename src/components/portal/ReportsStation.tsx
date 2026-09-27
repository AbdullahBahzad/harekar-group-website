"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ConsoleReport } from "@/lib/report-shape";
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

  const keyIncidents = report.content.items.slice(0, 3);
  const moreIncidents = report.content.items.slice(3);
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
            <a
              href={`/api/portal/reports/${report.id}/pdf`}
              aria-label={t("download")}
              title={t("download")}
              className="border-bone/20 text-bone/70 hover:border-gold hover:text-gold flex size-10 cursor-pointer items-center justify-center rounded-full border transition-colors"
            >
              <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden>
                <path d="M10 3v9.5M6.5 9 10 12.5 13.5 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3.75 14.5v1.25a1.5 1.5 0 0 0 1.5 1.5h9.5a1.5 1.5 0 0 0 1.5-1.5V14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </a>
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

      {keyIncidents.length > 0 && (
        <>
          <h3 className="text-gold/85 mt-7 text-xs font-medium tracking-[0.16em] uppercase">
            {t("keyIncidents")}
          </h3>
          <ul className="mt-3 space-y-3">
            {keyIncidents.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span aria-hidden className="bg-gold/60 mt-2 size-1.5 shrink-0 rounded-full" />
                <p className="text-bone/75">
                  <span className="text-bone font-medium">{item.title}</span>
                  {": "}
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      {moreIncidents.length > 0 && (
        <>
          <h3 className="text-gold/85 mt-7 text-xs font-medium tracking-[0.16em] uppercase">
            {t("additionalActivity")}
          </h3>
          <ul className="mt-3 space-y-2">
            {moreIncidents.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span aria-hidden className="bg-bone/30 mt-2 size-1.5 shrink-0 rounded-full" />
                <p className="text-bone/60">
                  <span className="text-bone/80">{item.title}</span>
                  {item.body ? `: ${item.body}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </>
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
            <a
              href={`/api/portal/reports/${report.id}/pdf`}
              className="border-gold/40 text-gold hover:bg-gold hover:text-ink flex min-h-9 shrink-0 items-center rounded-full border px-4 text-xs transition-colors"
            >
              {t("downloadPdf")}
            </a>
          </li>
        ))}
      </ul>
    </div>
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
