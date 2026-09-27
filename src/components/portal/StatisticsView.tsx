"use client";

import { useLocale, useTranslations } from "next-intl";
import type { PortalStats } from "@/lib/portal/stats";
import { formatDate, formatNumber } from "@/lib/portal/format";

const severityColor: Record<"CLEAR" | "ELEVATED" | "CRITICAL", string> = {
  CLEAR: "var(--color-status-clear)",
  ELEVATED: "var(--color-status-elevated)",
  CRITICAL: "var(--color-status-critical)",
};

/**
 * Aggregate counts over the published incident register.
 *
 * Every bar here is a single-hue magnitude encoding (severity's own reserved
 * status colors, or one gold hue for a plain count) rather than an invented
 * categorical palette — the one case that skips the colour-formula's CVD
 * pairwise check, because there is no adjacent pair of arbitrary hues to
 * confuse in the first place.
 */
export default function StatisticsView({ stats }: { stats: PortalStats }) {
  const t = useTranslations("portal.statistics");
  const tSeverity = useTranslations("intelligence.severity");
  const locale = useLocale();

  const maxProvince = Math.max(1, ...stats.byProvince.map((row) => row.count));
  const maxDay = Math.max(1, ...stats.dailyTrend.map((row) => row.count));
  const criticalOpen =
    stats.bySeverity.find((row) => row.severity === "CRITICAL")?.count ?? 0;

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

      {/* Stat tiles. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile label={t("totalIncidents")} value={stats.total} />
        <StatTile label={t("openIncidents")} value={stats.open} />
        <StatTile label={t("criticalIncidents")} value={criticalOpen} tone="critical" />
      </div>

      {/* Severity breakdown. */}
      <section className="mt-10">
        <h2 className="text-gold/85 text-xs font-medium tracking-[0.16em] uppercase">
          {t("bySeverity")}
        </h2>
        <div className="mt-4 space-y-3">
          {stats.bySeverity.map((row) => {
            const width = stats.total > 0 ? (row.count / stats.total) * 100 : 0;
            return (
              <div key={row.severity} className="flex items-center gap-4">
                <span className="text-bone/70 w-24 shrink-0 text-sm">
                  {tSeverity(row.severity.toLowerCase())}
                </span>
                <div className="bg-bone/8 h-3 min-w-0 flex-1 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${Math.max(width, row.count > 0 ? 3 : 0)}%`,
                      background: severityColor[row.severity],
                    }}
                  />
                </div>
                <span className="text-bone/70 w-10 shrink-0 text-end text-sm">
                  {formatNumber(row.count, locale)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* By province. */}
      {stats.byProvince.length > 0 && (
        <section className="mt-10">
          <h2 className="text-gold/85 text-xs font-medium tracking-[0.16em] uppercase">
            {t("byProvince")}
          </h2>
          <div className="mt-4 space-y-3">
            {stats.byProvince.map((row) => (
              <div key={row.province} className="flex items-center gap-4">
                <span className="text-bone/70 w-28 shrink-0 truncate text-sm">
                  {row.province}
                </span>
                <div className="bg-bone/8 h-3 min-w-0 flex-1 overflow-hidden rounded-full">
                  <div
                    className="bg-gold h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${(row.count / maxProvince) * 100}%` }}
                  />
                </div>
                <span className="text-bone/70 w-10 shrink-0 text-end text-sm">
                  {formatNumber(row.count, locale)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 14-day trend. */}
      <section className="mt-10">
        <h2 className="text-gold/85 text-xs font-medium tracking-[0.16em] uppercase">
          {t("dailyTrend")}
        </h2>
        {/* `h-full` on each bar's wrapper matters: a percentage `height` on the
            bar itself only resolves against a parent with a real height, and a
            flex item under `items-end` sizes to its own content (here, just an
            absolutely-positioned tooltip) rather than stretching to fill the
            row — without it every bar silently computes to 0px. */}
        <div className="mt-5 flex h-28 items-end gap-1.5">
          {stats.dailyTrend.map((row) => (
            <div key={row.date} className="group relative h-full flex-1">
              <div
                className="bg-gold/70 group-hover:bg-gold mx-auto w-full max-w-6 rounded-t-sm transition-colors"
                style={{ height: `${Math.max((row.count / maxDay) * 100, row.count > 0 ? 6 : 2)}%` }}
              />
              {/* Hover tooltip — the chart's own hover layer, per the dataviz
                  interaction contract. */}
              <span className="border-bone/16 bg-ink text-bone pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 rounded-md border px-2 py-1 text-[11px] whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100">
                {formatDate(new Date(row.date), locale, { month: "short", day: "numeric" })}
                {" — "}
                {t("incidentCount", { count: row.count })}
              </span>
            </div>
          ))}
        </div>
        {/* `getPortalStats` always returns exactly `TREND_DAYS` entries, so
            these two are never actually missing — the guard is only to keep
            this render pure without reaching for `Date.now()` as a fallback
            for a case that cannot happen. */}
        {stats.dailyTrend.length > 0 && (
          <div className="text-bone/45 mt-2 flex justify-between text-xs">
            <span>
              {formatDate(new Date(stats.dailyTrend[0].date), locale, {
                month: "short",
                day: "numeric",
              })}
            </span>
            <span>
              {formatDate(
                new Date(stats.dailyTrend[stats.dailyTrend.length - 1].date),
                locale,
                { month: "short", day: "numeric" },
              )}
            </span>
          </div>
        )}
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "critical";
}) {
  const locale = useLocale();
  return (
    <div className="border-bone/14 bg-surface/20 rounded-2xl border p-5">
      <p className="text-bone/55 text-xs tracking-[0.1em] uppercase">{label}</p>
      <p
        className="mt-2 text-4xl font-semibold"
        style={{ color: tone === "critical" ? "var(--color-status-critical)" : "var(--color-gold)" }}
      >
        {formatNumber(value, locale)}
      </p>
    </div>
  );
}
