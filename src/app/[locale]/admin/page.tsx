import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import Panel from "@/components/admin/Panel";
import { orPreview } from "@/lib/admin-preview";
import { formatDate, formatMoney } from "@/lib/admin-format";
import {
  getActivityFeed,
  getEngagement,
  getRevenueSummary,
  type ActivityTone,
  type MonthlyRevenue,
  type PlanSlice,
} from "@/lib/dashboard-overview";

/** Severity colours, matching the public map exactly. */
const severityTone = {
  CLEAR: "var(--color-status-clear)",
  ELEVATED: "var(--color-status-elevated)",
  CRITICAL: "var(--color-status-critical)",
} as const;

const activityColor: Record<ActivityTone, string> = {
  gold: "var(--color-gold)",
  clear: "var(--color-status-clear)",
  elevated: "var(--color-status-elevated)",
  critical: "var(--color-status-critical)",
  muted: "color-mix(in oklab, var(--color-bone) 35%, transparent)",
};

/**
 * The dashboard — the console's first screen, and the one the owner opens
 * without touching anything else.
 *
 * The top third is the Pro business: what it has earned, where the trend is
 * going, which plans carry it, who the biggest accounts are, and whose
 * subscription is about to lapse. The middle is a single braided log of
 * everything the site has done, with operational posture and the money still
 * in flight alongside it. The ten-station index sits at the foot for
 * navigation, not for reading.
 */
export default async function DashboardStation({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const operator = await requireAdmin(locale);
  const t = await getTranslations({ locale, namespace: "admin" });

  const { data: revenue } = await getRevenueSummary(locale);
  const { data: engagement } = await getEngagement();
  const { data: activity } = await getActivityFeed(22, locale);

  // The map's own posture and the inbox counters — one round trip.
  const { data: deck } = await orPreview(
    async () =>
      Promise.all([
        prisma.intelMarker.count({ where: { published: true } }),
        prisma.intelMarker.count({ where: { published: false } }),
        prisma.intelMarker.count({ where: { published: true, severity: "CRITICAL" } }),
        prisma.intelMarker.count({ where: { published: true, severity: "ELEVATED" } }),
        prisma.intelMarker.count({ where: { published: true, access: "LOCKED" } }),
        prisma.contactSubmission.count(),
        prisma.jobApplication.count(),
        prisma.user.count(),
      ]),
    [5, 1, 1, 2, 1, 3, 2, 7] as const,
  );
  const [published, drafts, critical, elevated, locked, messages, applications, accounts] =
    deck;

  // Every content station, counted the same way — published vs. hidden.
  const { data: content } = await orPreview(
    async () =>
      Promise.all([
        prisma.service.count({ where: { published: true } }),
        prisma.service.count({ where: { published: false } }),
        prisma.client.count({ where: { published: true } }),
        prisma.client.count({ where: { published: false } }),
        prisma.faqItem.count({ where: { published: true } }),
        prisma.faqItem.count({ where: { published: false } }),
        prisma.careerBenefit.count({ where: { published: true } }),
        prisma.careerBenefit.count({ where: { published: false } }),
        prisma.siteContent.count(),
        prisma.dailyReport.count(),
      ]),
    [13, 0, 37, 0, 6, 0, 5, 0, 0, 2] as const,
  );
  const [
    liveServices, hiddenServices,
    liveClients, hiddenClients,
    liveFaq, hiddenFaq,
    liveBenefits, hiddenBenefits,
    contentSaved, reportCount,
  ] = content;

  const posture: keyof typeof severityTone =
    critical > 0 ? "CRITICAL" : elevated > 0 ? "ELEVATED" : "CLEAR";
  const clear = Math.max(0, published - critical - elevated);

  const inFlight = revenue.pendingOrders + revenue.failedOrders;
  const primary = revenue.byCurrency[0];
  const secondary = revenue.byCurrency.slice(1);
  const currency = primary?.currency ?? "USD";
  const monthDelta = primary
    ? percentChange(primary.monthMinor, primary.lastMonthMinor)
    : null;

  const money = (minor: number) => formatMoney(minor, currency, locale);

  /** Relative age, translated. The exact time stays on the `title`. */
  const age = (date: Date, now: Date) => {
    const { key, count } = since(date, now);
    return key === "now" ? t("time.now") : t(`time.${key}`, { count });
  };

  /** A plan slug rendered in the reader's language, falling back to the slug. */
  const planLabel = (plan: string) =>
    plan === "monthly"
      ? t("dashboard.planMonthly")
      : plan === "yearly"
        ? t("dashboard.planYearly")
        : plan;

  // Server component: one render per request, so "now" is stable for this view.
  const now = new Date();

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-gold/78 text-[11px] tracking-[0.22em] uppercase">
            {t("dashboard.eyebrow")}
          </p>
          <h1 className="font-display text-bone mt-1.5 text-3xl leading-tight font-light sm:text-4xl">
            {t("dashboard.welcome", {
              name:
                operator.name?.split(" ")[0] ?? t("dashboard.welcomeFallback"),
            })}
          </h1>
        </div>
        <p className="text-bone/50 text-xs tabular-nums">
          {formatDate(now, locale, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>

      {/* ---- Pro subscription headline figures --------------------------- */}
      <Panel label={t("dashboard.pro")}>
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <Kpi
            label={t("dashboard.totalEarned")}
            value={primary ? money(primary.totalMinor) : "—"}
            hint={
              secondary.length > 0
                ? secondary
                    .map((c) => `+ ${formatMoney(c.totalMinor, c.currency, locale)}`)
                    .join("  ")
                : t("dashboard.paidOrdersHint", { count: revenue.paidOrders })
            }
          />
          <Kpi
            label={t("dashboard.thisMonth")}
            value={primary ? money(primary.monthMinor) : "—"}
            hint={
              primary
                ? t("dashboard.vsLastMonth", {
                    amount: money(primary.lastMonthMinor),
                  })
                : t("dashboard.noRevenueYet")
            }
            trend={monthDelta}
          />
          <Kpi
            label={t("dashboard.activeSubscribers")}
            value={revenue.subscribers.total.toString()}
            hint={t("dashboard.subscriberSplit", {
              paid: revenue.subscribers.paid,
              comped: revenue.subscribers.comped,
            })}
          />
          <Kpi
            label={t("dashboard.runRate")}
            value={revenue.runRateMinor > 0 ? money(revenue.runRateMinor) : "—"}
            hint={t("dashboard.runRateHint")}
          />
        </div>
      </Panel>

      {/* ---- revenue trend, plan mix, leaderboard ---------------------- */}
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel label={t("dashboard.revenue")}>
            <RevenueChart
              months={revenue.monthly}
              money={money}
              emptyLabel={t("dashboard.noRevenueSixMonths")}
              chartLabel={(series) =>
                t("dashboard.revenueChartLabel", { series })
              }
            />
            <div className="border-bone/12 grid grid-cols-3 border-t">
              <FootStat label={t("dashboard.avgOrder")} value={revenue.avgOrderMinor > 0 ? money(revenue.avgOrderMinor) : "—"} />
              <FootStat label={t("dashboard.paidOrders")} value={revenue.paidOrders.toString()} border />
              <FootStat label={t("dashboard.refunded")} value={revenue.refundedOrders.toString()} border />
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          <Panel label={t("dashboard.planMix")}>
            <PlanMixBar
              slices={revenue.planMix}
              money={money}
              planLabel={planLabel}
              orderLabel={(count) => t("dashboard.orders", { count })}
              emptyLabel={t("dashboard.noPaidOrders")}
            />
          </Panel>

          <Panel label={t("dashboard.topAccounts")}>
            {revenue.topAccounts.length === 0 ? (
              <p className="text-bone/50 px-4 py-8 text-center text-sm">
                {t("dashboard.noPaidAccounts")}
              </p>
            ) : (
              <ul className="divide-bone/6 divide-y">
                {revenue.topAccounts.map((account, i) => (
                  <li
                    key={account.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span className="font-display text-bone/56 w-4 text-lg leading-none">
                      {i + 1}
                    </span>
                    <span className="text-bone/80 min-w-0 flex-1 truncate text-sm">
                      {account.who}
                      <span className="text-bone/60">
                        {" · "}
                        {t("dashboard.orders", { count: account.orders })}
                      </span>
                    </span>
                    <span className="text-gold text-sm tabular-nums">
                      {formatMoney(account.minor, account.currency, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {/* ---- activity + status ------------------------------------------- */}
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel label={t("dashboard.activity")}>
            <ul className="divide-bone/6 divide-y">
              {activity.length === 0 && (
                <li className="text-bone/50 px-4 py-8 text-center text-sm">
                  {t("dashboard.noActivity")}
                </li>
              )}
              {activity.map((event) => (
                <li key={event.id}>
                  <Link
                    href={event.href}
                    className="hover:bg-bone/[0.03] flex items-start gap-3 px-4 py-3 transition-colors"
                  >
                    <span
                      aria-hidden
                      className="mt-1.5 size-2 shrink-0 rounded-full"
                      style={{ background: activityColor[event.tone] }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-bone/85 text-sm">
                        {t(`activity.${event.titleKey}`)}
                      </span>
                      <span className="text-bone/50 ms-2 text-xs">
                        {event.detail}
                      </span>
                    </span>
                    <time
                      dateTime={event.at.toISOString()}
                      className="text-bone/56 shrink-0 text-xs tabular-nums"
                      title={formatDate(event.at, locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    >
                      {age(event.at, now)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          <Panel
            label={t("dashboard.status")}
            tone={posture.toLowerCase() as "clear" | "elevated" | "critical"}
          >
            <div className="p-5">
              <p
                className="font-display text-4xl leading-none font-light"
                style={{ color: severityTone[posture] }}
              >
                {t(`severity.${posture}`)}
              </p>
              <p className="text-bone/50 mt-1.5 text-xs">
                {t("dashboard.highestSeverity")}
              </p>

              <SeverityBar clear={clear} elevated={elevated} critical={critical} />

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                <MiniStat label={t("dashboard.liveMarkers")} value={published} />
                <MiniStat label={t("dashboard.proGated")} value={locked} />
                <MiniStat label={t("dashboard.critical")} value={critical} tone="CRITICAL" />
                <MiniStat label={t("dashboard.elevated")} value={elevated} tone="ELEVATED" />
              </dl>

              <Link
                href="/admin/intelligence"
                className="border-gold/50 text-gold hover:bg-gold hover:text-ink mt-5 inline-flex items-center gap-2 border px-4 py-2 text-xs transition-colors"
              >
                {t("dashboard.openMap")}
                {/* Flipped in RTL: an arrow means "onward", not "east". */}
                <span aria-hidden className="inline-block rtl:rotate-180">
                  →
                </span>
              </Link>
            </div>
          </Panel>

          <Panel label={t("dashboard.renewals")}>
            {engagement.renewals.length === 0 ? (
              <p className="text-bone/50 px-4 py-6 text-sm leading-relaxed">
                {t("dashboard.noRenewals")}
              </p>
            ) : (
              <ul className="divide-bone/6 divide-y">
                {engagement.renewals.map((renewal) => (
                  <li
                    key={renewal.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <span className="text-bone/80 min-w-0 flex-1 truncate text-sm">
                      {renewal.who}
                    </span>
                    <span
                      className="shrink-0 text-xs tabular-nums"
                      style={{
                        color:
                          renewal.daysLeft <= 7
                            ? "var(--color-status-critical)"
                            : "var(--color-status-elevated)",
                      }}
                    >
                      {t("dashboard.daysLeft", { count: renewal.daysLeft })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel label={t("dashboard.recentPayments")}>
            <ul className="divide-bone/6 divide-y">
              {revenue.recent.length === 0 && (
                <li className="text-bone/50 px-4 py-6 text-center text-sm">
                  {t("dashboard.noPayments")}
                </li>
              )}
              {revenue.recent.map((payment) => (
                <li
                  key={payment.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <span className="text-bone/80 min-w-0 flex-1 truncate text-sm">
                    {payment.who}
                    <span className="text-bone/60">
                      {" · "}
                      {planLabel(payment.plan)}
                    </span>
                  </span>
                  <span className="text-status-clear text-xs tabular-nums">
                    {formatMoney(payment.amountMinor, payment.currency, locale)}
                  </span>
                  <time
                    dateTime={payment.at.toISOString()}
                    className="text-bone/56 w-12 shrink-0 text-end text-xs tabular-nums"
                  >
                    {age(payment.at, now)}
                  </time>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel label={t("dashboard.inbound")}>
            <div className="grid grid-cols-2">
              {engagement.inbound.map((metric, i) => (
                <Link
                  key={metric.labelKey}
                  href={metric.href}
                  className={cn(
                    "border-bone/10 hover:bg-bone/[0.03] p-4 transition-colors",
                    i < 2 && "border-b",
                    i % 2 === 0 && "border-e",
                  )}
                >
                  <p className="text-bone text-xl leading-none tabular-nums">
                    {metric.count}
                  </p>
                  <p className="text-bone/50 mt-1.5 flex items-center gap-1.5 text-xs">
                    <Delta current={metric.count} prev={metric.prev} />
                    <span className="truncate">
                      {t(`inbound.${metric.labelKey}`)}
                    </span>
                  </p>
                </Link>
              ))}
            </div>
          </Panel>

          {inFlight > 0 && (
            <Panel label={t("dashboard.reconcile")} tone="elevated">
              {/*
               * `border-s` on the second cell rather than `divide-x`: divide-x
               * is written in physical left/right, so under `dir="rtl"` it
               * draws the rule down the outside edge instead of between them.
               */}
              <div className="flex">
                <Link
                  href="/admin/accounts"
                  className="hover:bg-bone/[0.03] flex-1 px-4 py-3 transition-colors"
                >
                  <p className="text-status-elevated text-xl tabular-nums">
                    {revenue.pendingOrders}
                  </p>
                  <p className="text-bone/50 mt-1 text-xs">
                    {t("dashboard.pending")}
                  </p>
                </Link>
                <Link
                  href="/admin/accounts"
                  className="hover:bg-bone/[0.03] border-bone/12 flex-1 border-s px-4 py-3 transition-colors"
                >
                  <p className="text-status-critical text-xl tabular-nums">
                    {revenue.failedOrders}
                  </p>
                  <p className="text-bone/50 mt-1 text-xs">
                    {t("dashboard.failed")}
                  </p>
                </Link>
              </div>
            </Panel>
          )}
        </div>
      </div>

      {/* ---- station index ---------------------------------------------- */}
      <div className="mt-5">
        <Panel label={t("dashboard.stations")}>
          <div className="grid sm:grid-cols-2">
            <StatRow
              href="/admin/content"
              label={t("dashboard.stationSiteContent")}
              value={
                contentSaved > 0
                  ? t("dashboard.stationSiteContentLive")
                  : t("dashboard.stationSiteContentShipped")
              }
              note={
                contentSaved > 0
                  ? t("dashboard.stationSiteContentNoteLive")
                  : t("dashboard.stationSiteContentNoteShipped")
              }
            />
            <StatRow href="/admin/intelligence" label={t("dashboard.stationMarkers")} value={published} note={t("dashboard.stationMarkersNote", { count: drafts })} />
            <StatRow href="/admin/services" label={t("dashboard.stationServices")} value={liveServices} note={t("dashboard.hiddenNote", { count: hiddenServices })} />
            <StatRow href="/admin/clients" label={t("dashboard.stationClients")} value={liveClients} note={t("dashboard.hiddenNote", { count: hiddenClients })} />
            <StatRow href="/admin/faq" label={t("dashboard.stationFaq")} value={liveFaq} note={t("dashboard.hiddenNote", { count: hiddenFaq })} />
            <StatRow href="/admin/benefits" label={t("dashboard.stationBenefits")} value={liveBenefits} note={t("dashboard.hiddenNote", { count: hiddenBenefits })} />
            <StatRow href="/admin/sources" label={t("dashboard.stationReports")} value={reportCount} note={t("dashboard.stationReportsNote")} />
            <StatRow href="/admin/messages" label={t("dashboard.stationMessages")} value={messages} note={t("dashboard.stationMessagesNote")} />
            <StatRow href="/admin/applications" label={t("dashboard.stationApplications")} value={applications} note={t("dashboard.stationApplicationsNote")} />
            <StatRow href="/admin/accounts" label={t("dashboard.stationAccounts")} value={accounts} note={t("dashboard.stationAccountsNote", { count: revenue.subscribers.total })} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---- pieces ------------------------------------------------------------- */

function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Relative age, kept to one unit and returned as a key plus a count so the
 * caller can translate it. Returning a formatted English string here would
 * make "3d" the one part of the console that never changes language.
 */
function since(
  date: Date,
  now: Date,
): { key: "now" | "minutes" | "hours" | "days" | "weeks"; count: number } {
  const s = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (s < 60) return { key: "now", count: 0 };
  const m = Math.round(s / 60);
  if (m < 60) return { key: "minutes", count: m };
  const h = Math.round(m / 60);
  if (h < 24) return { key: "hours", count: h };
  const d = Math.round(h / 24);
  if (d < 7) return { key: "days", count: d };
  return { key: "weeks", count: Math.round(d / 7) };
}

function Kpi({
  label,
  value,
  hint,
  trend,
}: {
  label: string;
  value: string;
  hint: string;
  trend?: number | null;
}) {
  return (
    <div className="border-bone/10 border-b p-5 last:border-b-0 sm:[&:nth-child(odd)]:border-e lg:border-b-0 lg:not-last:border-e">
      <p className="text-bone/50 text-[11px] tracking-[0.12em] uppercase">
        {label}
      </p>
      <p
        className="text-bone mt-2 text-2xl leading-none font-normal tabular-nums sm:text-[1.75rem]"
        style={{ fontFeatureSettings: '"lnum" 1, "tnum" 1' }}
      >
        {value}
      </p>
      <p className="text-bone/60 mt-2 flex items-center gap-1.5 text-xs">
        {trend != null && <TrendPill value={trend} />}
        <span className="truncate">{hint}</span>
      </p>
    </div>
  );
}

/*
 * `dir="ltr"` on the numeric pills below.
 *
 * Their content is a caret, a sign and a unit around a number — "▲+15%". Left
 * to the bidi algorithm inside an RTL paragraph that reorders to "%15+▲",
 * which reads as a different figure. Pinning the run keeps the sign attached
 * to the number it belongs to.
 */
function TrendPill({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      dir="ltr"
      className="inline-flex items-center gap-0.5 tabular-nums"
      style={{
        color: up
          ? "var(--color-status-clear)"
          : "var(--color-status-critical)",
      }}
    >
      <Caret up={up} />
      {up ? "+" : ""}
      {value}%
    </span>
  );
}

/** Absolute week-on-week change, for small inbound counts. */
function Delta({ current, prev }: { current: number; prev: number }) {
  const d = current - prev;
  if (d === 0) {
    return (
      <span dir="ltr" className="text-bone/52 tabular-nums">
        ±0
      </span>
    );
  }
  const up = d > 0;
  return (
    <span
      dir="ltr"
      className="inline-flex items-center gap-0.5 tabular-nums"
      style={{
        color: up
          ? "var(--color-status-clear)"
          : "var(--color-status-critical)",
      }}
    >
      <Caret up={up} />
      {up ? "+" : ""}
      {d}
    </span>
  );
}

function Caret({ up }: { up: boolean }) {
  return (
    <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
      <path d={up ? "M5 2 9 8 1 8Z" : "M5 8 1 2 9 2Z"} fill="currentColor" />
    </svg>
  );
}

/**
 * The six-month revenue bars.
 *
 * Plain SVG, no chart library: six values do not need one, and hand-drawing
 * it keeps the current, still-accruing month distinct — drawn as a dashed
 * outline rather than a solid bar so a low number early in the month does not
 * read as a collapse.
 *
 * Deliberately *not* mirrored under RTL. A time axis running left-to-right is
 * how every chart an operator reconciles against is drawn, and the month
 * labels underneath say which column is which.
 */
function RevenueChart({
  months,
  money,
  emptyLabel,
  chartLabel,
}: {
  months: MonthlyRevenue[];
  money: (minor: number) => string;
  emptyLabel: string;
  chartLabel: (series: string) => string;
}) {
  const total = months.reduce((sum, m) => sum + m.minor, 0);
  if (total === 0) {
    return (
      <p className="text-bone/50 px-5 py-12 text-center text-sm">
        {emptyLabel}
      </p>
    );
  }

  const W = 340;
  const H = 94;
  const pad = 6;
  const gap = 10;
  const bw = (W - pad * 2 - gap * (months.length - 1)) / months.length;
  const max = Math.max(...months.map((m) => m.minor));
  const peak = months.reduce((a, b) => (b.minor > a.minor ? b : a));

  return (
    <div className="p-5">
      <svg
        viewBox={`0 0 ${W} ${H + 24}`}
        className="w-full"
        role="img"
        // Set as CSS rather than `dir`: React's SVG typings have no `dir` prop,
        // and `direction` is what `<text>` actually inherits either way.
        style={{ direction: "ltr" }}
        aria-label={chartLabel(
          months.map((m) => `${m.label} ${money(m.minor)}`).join(", "),
        )}
      >
        <defs>
          <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-gold-bright)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--color-gold)" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        <line
          x1={pad}
          y1={H}
          x2={W - pad}
          y2={H}
          stroke="var(--color-bone)"
          strokeOpacity="0.15"
        />

        {months.map((m, i) => {
          const h = m.minor === 0 ? 0 : Math.max(3, (m.minor / max) * (H - 20));
          const x = pad + i * (bw + gap);
          const y = H - h;
          const isPeak = m.label === peak.label && m.minor > 0;
          return (
            <g key={m.label}>
              <title>{`${m.label}: ${money(m.minor)}`}</title>
              {m.partial ? (
                <rect
                  x={x}
                  y={y}
                  width={bw}
                  height={h}
                  rx="2.5"
                  fill="var(--color-gold)"
                  fillOpacity="0.12"
                  stroke="var(--color-gold)"
                  strokeOpacity="0.6"
                  strokeDasharray="3 2"
                />
              ) : (
                <rect x={x} y={y} width={bw} height={h} rx="2.5" fill="url(#rev-fill)" />
              )}
              {isPeak && (
                <text
                  x={x + bw / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fill="var(--color-gold-bright)"
                  fontSize="9"
                >
                  {money(m.minor)}
                </text>
              )}
              <text
                x={x + bw / 2}
                y={H + 16}
                textAnchor="middle"
                fill="var(--color-bone)"
                fillOpacity="0.4"
                fontSize="9"
              >
                {m.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function planColor(plan: string, index: number): string {
  if (plan === "yearly") return "var(--color-gold)";
  if (plan === "monthly")
    return "color-mix(in oklab, var(--color-bone) 45%, transparent)";
  const fallback = [
    "var(--color-status-clear)",
    "var(--color-status-elevated)",
    "var(--color-gold-bright)",
  ];
  return fallback[index % fallback.length];
}

function PlanMixBar({
  slices,
  money,
  planLabel,
  orderLabel,
  emptyLabel,
}: {
  slices: PlanSlice[];
  money: (minor: number) => string;
  planLabel: (plan: string) => string;
  orderLabel: (count: number) => string;
  emptyLabel: string;
}) {
  const total = slices.reduce((sum, s) => sum + s.minor, 0);
  if (total === 0) {
    return (
      <p className="text-bone/50 px-5 py-12 text-center text-sm">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="p-5">
      <div className="bg-bone/8 flex h-2.5 overflow-hidden rounded-full">
        {slices.map((slice, i) => (
          <div
            key={slice.plan}
            style={{
              width: `${(slice.minor / total) * 100}%`,
              background: planColor(slice.plan, i),
            }}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {slices.map((slice, i) => (
          <li key={slice.plan} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ background: planColor(slice.plan, i) }}
            />
            <span className="text-bone/70 flex-1">{planLabel(slice.plan)}</span>
            <span className="text-bone/60 text-xs tabular-nums">
              {orderLabel(slice.orders)}
            </span>
            <span className="text-bone/80 w-16 text-end text-xs tabular-nums">
              {money(slice.minor)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SeverityBar({
  clear,
  elevated,
  critical,
}: {
  clear: number;
  elevated: number;
  critical: number;
}) {
  const total = clear + elevated + critical;
  if (total === 0) return null;
  const parts: [number, string][] = [
    [clear, "var(--color-status-clear)"],
    [elevated, "var(--color-status-elevated)"],
    [critical, "var(--color-status-critical)"],
  ];
  return (
    <div className="bg-bone/8 mt-4 flex h-1.5 overflow-hidden rounded-full">
      {parts.map(
        ([value, color], i) =>
          value > 0 && (
            <div key={i} style={{ flex: value, background: color }} />
          ),
      )}
    </div>
  );
}

function FootStat({
  label,
  value,
  border,
}: {
  label: string;
  value: string;
  border?: boolean;
}) {
  return (
    <div className={cn("px-4 py-3", border && "border-bone/12 border-s")}>
      <p className="text-bone/80 text-sm tabular-nums">{value}</p>
      <p className="text-bone/60 mt-0.5 text-xs">{label}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: keyof typeof severityTone;
}) {
  return (
    <div>
      <dd
        className="text-lg leading-none tabular-nums"
        style={{ color: tone ? severityTone[tone] : "var(--color-bone)" }}
      >
        {value}
      </dd>
      <dt className="text-bone/50 mt-1 text-xs">{label}</dt>
    </div>
  );
}

/** One station in the index grid — name, count, and a one-word note. */
function StatRow({
  href,
  label,
  value,
  note,
}: {
  href: string;
  label: string;
  value: number | string;
  note: string;
}) {
  return (
    <Link
      href={href}
      className="group border-bone/10 flex items-center justify-between gap-4 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-bone/[0.03] sm:odd:border-e"
    >
      <span className="text-bone/70 group-hover:text-bone text-sm transition-colors">
        {label}
      </span>
      <span className="flex items-center gap-3">
        <span className="text-bone group-hover:text-gold text-base tabular-nums transition-colors">
          {value}
        </span>
        <span className="text-bone/56 w-24 shrink-0 truncate text-end text-xs">
          {note}
        </span>
      </span>
    </Link>
  );
}
