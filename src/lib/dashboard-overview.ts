import { prisma } from "@/lib/prisma";
import { orPreview } from "@/lib/admin-preview";
import { formatDate, formatMoney } from "@/lib/admin-format";

/**
 * The dashboard's business layer.
 *
 * Two things the owner opens the console to see and nothing else does:
 *
 *  - `getRevenueSummary` — what Pro has actually earned, this month against
 *    last, how many subscribers are live, and which orders are stuck between
 *    "started" and "paid" and need a human to reconcile them.
 *  - `getActivityFeed` — one reverse-chronological log of everything the site
 *    did: a payment, a signup, a quote request, a job application, a map edit,
 *    a report. The individual stations each show their own slice; this is the
 *    single place they are braided back together so nothing that happened is
 *    off-screen.
 *  - `getEngagement` — purchased subscriptions about to lapse, and this week's
 *    inbound demand against last week's.
 *
 * All degrade to representative sample data when Postgres is unreachable, the
 * same contract every other console read already follows.
 *
 * Everything user-facing that these produce is either a number formatted for
 * the caller's locale or a *translation key* — never an English sentence. The
 * console renders in three languages, so a label baked in here would be one
 * the page had no way to translate.
 */

/* ---- money -------------------------------------------------------------- */

/** First of this month and first of last month, in UTC. */
function monthBounds(now = new Date()) {
  const thisMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const lastMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  return { thisMonth, lastMonth };
}

/** The last six calendar months, oldest first, as UTC half-open ranges. */
function lastSixMonths(now: Date, locale: string) {
  const out: { start: Date; end: Date; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
    );
    const end = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1),
    );
    out.push({
      start,
      end,
      label: formatDate(start, locale, { month: "short" }),
    });
  }
  return out;
}

/* ---- revenue ----------------------------------------------------------- */

export type RevenueByCurrency = {
  currency: string;
  totalMinor: number;
  monthMinor: number;
  lastMonthMinor: number;
  orders: number;
};

export type RevenuePayment = {
  id: string;
  who: string;
  plan: string;
  amountMinor: number;
  currency: string;
  at: Date;
};

/** One column of the revenue trend chart. */
export type MonthlyRevenue = { label: string; minor: number; partial: boolean };

/** A slice of the plan-mix bar. */
export type PlanSlice = { plan: string; orders: number; minor: number };

/** A row of the lifetime-value leaderboard. */
export type TopAccount = {
  id: string;
  who: string;
  minor: number;
  currency: string;
  orders: number;
};

export type RevenueSummary = {
  byCurrency: RevenueByCurrency[];
  paidOrders: number;
  pendingOrders: number;
  failedOrders: number;
  refundedOrders: number;
  avgOrderMinor: number;
  runRateMinor: number;
  subscribers: { total: number; paid: number; comped: number };
  recent: RevenuePayment[];
  monthly: MonthlyRevenue[];
  planMix: PlanSlice[];
  topAccounts: TopAccount[];
};

export async function getRevenueSummary(locale: string): Promise<{
  data: RevenueSummary;
  preview: boolean;
}> {
  const now = new Date();
  const { thisMonth, lastMonth } = monthBounds(now);
  const months = lastSixMonths(now, locale);

  return orPreview<RevenueSummary>(
    async () => {
      const [
        totals,
        thisMonthTotals,
        lastMonthTotals,
        paidOrders,
        pendingOrders,
        failedOrders,
        cancelledOrders,
        compedSubs,
        paidSubs,
        recentRows,
        paidSince,
        planGroups,
        topGroups,
      ] = await Promise.all([
        prisma.order.groupBy({
          by: ["currency"],
          where: { status: "PAID" },
          _sum: { amountMinor: true },
          _count: { _all: true },
        }),
        prisma.order.groupBy({
          by: ["currency"],
          where: { status: "PAID", paidAt: { gte: thisMonth } },
          _sum: { amountMinor: true },
        }),
        prisma.order.groupBy({
          by: ["currency"],
          where: { status: "PAID", paidAt: { gte: lastMonth, lt: thisMonth } },
          _sum: { amountMinor: true },
        }),
        prisma.order.count({ where: { status: "PAID" } }),
        prisma.order.count({ where: { status: "PENDING" } }),
        prisma.order.count({ where: { status: "FAILED" } }),
        prisma.order.count({ where: { status: "CANCELLED" } }),
        prisma.user.count({ where: { isPro: true } }),
        prisma.user.count({ where: { isPro: false, proUntil: { gt: now } } }),
        prisma.order.findMany({
          where: { status: "PAID" },
          orderBy: { paidAt: "desc" },
          take: 6,
          select: {
            id: true,
            plan: true,
            amountMinor: true,
            currency: true,
            paidAt: true,
            createdAt: true,
            user: { select: { name: true, email: true } },
          },
        }),
        prisma.order.findMany({
          where: { status: "PAID", paidAt: { gte: months[0].start } },
          select: { amountMinor: true, currency: true, paidAt: true },
        }),
        prisma.order.groupBy({
          by: ["plan"],
          where: { status: "PAID" },
          _sum: { amountMinor: true },
          _count: { _all: true },
        }),
        prisma.order.groupBy({
          by: ["userId"],
          where: { status: "PAID" },
          _sum: { amountMinor: true },
          _count: { _all: true },
          orderBy: { _sum: { amountMinor: "desc" } },
          take: 3,
        }),
      ]);

      const sumFor = (
        rows: { currency: string; _sum: { amountMinor: number | null } }[],
        currency: string,
      ) => rows.find((r) => r.currency === currency)?._sum.amountMinor ?? 0;

      const byCurrency: RevenueByCurrency[] = totals
        .map((row) => ({
          currency: row.currency,
          totalMinor: row._sum.amountMinor ?? 0,
          monthMinor: sumFor(thisMonthTotals, row.currency),
          lastMonthMinor: sumFor(lastMonthTotals, row.currency),
          orders: row._count._all,
        }))
        .sort((a, b) => b.totalMinor - a.totalMinor);

      const primary = byCurrency[0];
      const primaryCurrency = primary?.currency ?? "USD";

      // Trend chart: bucket paid orders in the primary currency by month.
      const monthly: MonthlyRevenue[] = months.map((m, i) => ({
        label: m.label,
        minor: paidSince
          .filter(
            (o) =>
              o.currency === primaryCurrency &&
              o.paidAt &&
              o.paidAt >= m.start &&
              o.paidAt < m.end,
          )
          .reduce((sum, o) => sum + o.amountMinor, 0),
        partial: i === months.length - 1,
      }));

      const planMix: PlanSlice[] = planGroups
        .map((g) => ({
          plan: g.plan,
          orders: g._count._all,
          minor: g._sum.amountMinor ?? 0,
        }))
        .sort((a, b) => b.minor - a.minor);

      const topUsers =
        topGroups.length > 0
          ? await prisma.user.findMany({
              where: { id: { in: topGroups.map((g) => g.userId) } },
              select: { id: true, name: true, email: true },
            })
          : [];
      const topAccounts: TopAccount[] = topGroups.map((g) => {
        const u = topUsers.find((x) => x.id === g.userId);
        return {
          id: g.userId,
          who: u?.name ?? u?.email ?? "Unknown",
          minor: g._sum.amountMinor ?? 0,
          currency: primaryCurrency,
          orders: g._count._all,
        };
      });

      const primaryPaid = primary?.orders ?? 0;
      const avgOrderMinor =
        primaryPaid > 0 ? Math.round((primary?.totalMinor ?? 0) / primaryPaid) : 0;

      /*
       * Annualised run rate: the last three months of primary-currency
       * revenue, x4. A rougher figure than a per-subscription MRR roll-up, but
       * it needs no assumptions about which plan each active subscriber is on
       * and it tracks reality — a quiet quarter pulls it down on its own.
       */
      const lastThreeStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1),
      );
      const runRateMinor =
        paidSince
          .filter((o) => o.currency === primaryCurrency && o.paidAt && o.paidAt >= lastThreeStart)
          .reduce((sum, o) => sum + o.amountMinor, 0) * 4;

      return {
        byCurrency,
        paidOrders,
        pendingOrders,
        failedOrders,
        refundedOrders: cancelledOrders,
        avgOrderMinor,
        runRateMinor,
        subscribers: {
          total: compedSubs + paidSubs,
          paid: paidSubs,
          comped: compedSubs,
        },
        recent: recentRows.map((row) => ({
          id: row.id,
          who: row.user.name ?? row.user.email,
          plan: row.plan,
          amountMinor: row.amountMinor,
          currency: row.currency,
          at: row.paidAt ?? row.createdAt,
        })),
        monthly,
        planMix,
        topAccounts,
      };
    },
    sampleRevenue(locale),
  );
}

/* ---- engagement ------------------------------------------------------------ */

export type Renewal = { id: string; who: string; at: Date; daysLeft: number };

export type InboundMetric = {
  /** Key under the `admin.inbound` namespace — see the note at the top. */
  labelKey: string;
  count: number;
  prev: number;
  href: string;
};

export type Engagement = {
  renewals: Renewal[];
  inbound: InboundMetric[];
};

/**
 * The relationship side of the business: purchased subscriptions about to
 * lapse (a renewal to chase before it becomes churn), and how much new demand
 * came in this week against last.
 */
export async function getEngagement(): Promise<{
  data: Engagement;
  preview: boolean;
}> {
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const weekAgo = new Date(now.getTime() - 7 * day);
  const twoWeeksAgo = new Date(now.getTime() - 14 * day);
  const soon = new Date(now.getTime() + 14 * day);

  return orPreview<Engagement>(
    async () => {
      const [
        expiring,
        msgThis,
        msgPrev,
        appThis,
        appPrev,
        userThis,
        userPrev,
        orderThis,
        orderPrev,
      ] = await Promise.all([
        prisma.user.findMany({
          where: { isPro: false, proUntil: { gte: now, lte: soon } },
          orderBy: { proUntil: "asc" },
          take: 6,
          select: { id: true, name: true, email: true, proUntil: true },
        }),
        prisma.contactSubmission.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.contactSubmission.count({
          where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
        }),
        prisma.jobApplication.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.jobApplication.count({
          where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
        }),
        prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.user.count({
          where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
        }),
        prisma.order.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.order.count({
          where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
        }),
      ]);

      return {
        renewals: expiring.map((u) => ({
          id: u.id,
          who: u.name ?? u.email,
          at: u.proUntil!,
          daysLeft: Math.max(
            0,
            Math.ceil((u.proUntil!.getTime() - now.getTime()) / day),
          ),
        })),
        inbound: [
          { labelKey: "messages", count: msgThis, prev: msgPrev, href: "/admin/messages" },
          { labelKey: "applications", count: appThis, prev: appPrev, href: "/admin/applications" },
          { labelKey: "accounts", count: userThis, prev: userPrev, href: "/admin/accounts" },
          { labelKey: "checkouts", count: orderThis, prev: orderPrev, href: "/admin/accounts" },
        ],
      };
    },
    SAMPLE_ENGAGEMENT,
  );
}

/* ---- activity feed --------------------------------------------------------- */

export type ActivityKind =
  | "payment"
  | "payment_failed"
  | "checkout"
  | "signup"
  | "message"
  | "application"
  | "map_edit"
  | "report";

export type ActivityTone = "gold" | "clear" | "elevated" | "critical" | "muted";

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  /**
   * Key under the `admin.activity` namespace. Not the same axis as `kind`:
   * a map edit reads as "updated" or "saved as draft" depending on whether the
   * marker is published, so the two share a kind but not a title.
   */
  titleKey: string;
  detail: string;
  at: Date;
  href: string;
  tone: ActivityTone;
};

const severityTone: Record<string, ActivityTone> = {
  CLEAR: "clear",
  ELEVATED: "elevated",
  CRITICAL: "critical",
};

/**
 * The braided log. Each source is capped before the merge so one busy table
 * (contact spam, a burst of map edits) cannot crowd everything else out of
 * the window, then the union is sorted once and sliced to `take`.
 */
export async function getActivityFeed(
  take = 24,
  locale = "en",
): Promise<{
  data: ActivityEvent[];
  preview: boolean;
}> {
  return orPreview<ActivityEvent[]>(
    async () => {
      const [orders, users, messages, applications, markers, reports] =
        await Promise.all([
          prisma.order.findMany({
            orderBy: { createdAt: "desc" },
            take: 16,
            select: {
              id: true,
              status: true,
              plan: true,
              amountMinor: true,
              currency: true,
              createdAt: true,
              paidAt: true,
              user: { select: { name: true, email: true } },
            },
          }),
          prisma.user.findMany({
            orderBy: { createdAt: "desc" },
            take: 10,
            select: { id: true, name: true, email: true, createdAt: true },
          }),
          prisma.contactSubmission.findMany({
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              id: true,
              name: true,
              organization: true,
              createdAt: true,
            },
          }),
          prisma.jobApplication.findMany({
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              id: true,
              name: true,
              position: true,
              createdAt: true,
            },
          }),
          prisma.intelMarker.findMany({
            orderBy: { updatedAt: "desc" },
            take: 12,
            select: {
              id: true,
              label: true,
              severity: true,
              published: true,
              updatedAt: true,
              updatedBy: { select: { name: true, email: true } },
            },
          }),
          prisma.dailyReport.findMany({
            orderBy: { createdAt: "desc" },
            take: 6,
            select: {
              id: true,
              date: true,
              createdAt: true,
              createdBy: { select: { name: true, email: true } },
            },
          }),
        ]);

      const events: ActivityEvent[] = [];

      for (const order of orders) {
        const who = order.user.name ?? order.user.email;
        const money = formatMoney(order.amountMinor, order.currency, locale);
        if (order.status === "PAID") {
          events.push({
            id: `order-${order.id}`,
            kind: "payment",
            titleKey: "payment",
            detail: `${who} · ${order.plan} · ${money}`,
            at: order.paidAt ?? order.createdAt,
            href: "/admin/accounts",
            tone: "clear",
          });
        } else if (order.status === "FAILED") {
          events.push({
            id: `order-${order.id}`,
            kind: "payment_failed",
            titleKey: "payment_failed",
            detail: `${who} · ${order.plan} · ${money}`,
            at: order.createdAt,
            href: "/admin/accounts",
            tone: "critical",
          });
        } else if (order.status === "PENDING") {
          events.push({
            id: `order-${order.id}`,
            kind: "checkout",
            titleKey: "checkout",
            detail: `${who} · ${order.plan} · ${money}`,
            at: order.createdAt,
            href: "/admin/accounts",
            tone: "elevated",
          });
        }
      }

      for (const user of users) {
        events.push({
          id: `user-${user.id}`,
          kind: "signup",
          titleKey: "signup",
          detail: user.name ?? user.email,
          at: user.createdAt,
          href: "/admin/accounts",
          tone: "gold",
        });
      }

      for (const message of messages) {
        events.push({
          id: `msg-${message.id}`,
          kind: "message",
          titleKey: "message",
          detail: message.organization
            ? `${message.name} · ${message.organization}`
            : message.name,
          at: message.createdAt,
          href: "/admin/messages",
          tone: "gold",
        });
      }

      for (const application of applications) {
        events.push({
          id: `app-${application.id}`,
          kind: "application",
          titleKey: "application",
          detail: `${application.name} · ${application.position}`,
          at: application.createdAt,
          href: "/admin/applications",
          tone: "muted",
        });
      }

      for (const marker of markers) {
        const by = marker.updatedBy?.name ?? marker.updatedBy?.email;
        events.push({
          id: `marker-${marker.id}`,
          kind: "map_edit",
          titleKey: marker.published ? "map_edit" : "map_draft",
          detail: by ? `${marker.label} · ${by}` : marker.label,
          at: marker.updatedAt,
          href: "/admin/intelligence",
          tone: marker.published
            ? (severityTone[marker.severity] ?? "muted")
            : "muted",
        });
      }

      for (const report of reports) {
        const by = report.createdBy?.name ?? report.createdBy?.email;
        const day = formatDate(report.date, locale, {
          month: "short",
          day: "numeric",
        });
        events.push({
          id: `report-${report.id}`,
          kind: "report",
          titleKey: "report",
          detail: by ? `${day} · ${by}` : day,
          at: report.createdAt,
          href: "/admin/sources",
          tone: "elevated",
        });
      }

      return events
        .sort((a, b) => b.at.getTime() - a.at.getTime())
        .slice(0, take);
    },
    sampleActivity(locale).slice(0, take),
  );
}

/* ---- sample data (database unreachable) --------------------------------- */

const day = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * day);

/** Six month labels ending on the current month, for the sample chart. */
function sampleMonthLabels(locale: string) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) =>
    formatDate(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 1)),
      locale,
      { month: "short" },
    ),
  );
}

const sampleRevenue = (locale: string): RevenueSummary => {
  const labels = sampleMonthLabels(locale);
  return {
  byCurrency: [
    { currency: "USD", totalMinor: 1_575_000, monthMinor: 500_000, lastMonthMinor: 275_000, orders: 9 },
  ],
  paidOrders: 9,
  pendingOrders: 2,
  failedOrders: 1,
  refundedOrders: 1,
  avgOrderMinor: 175_000,
  runRateMinor: 4_300_000,
  subscribers: { total: 7, paid: 5, comped: 2 },
  recent: [
    { id: "o1", who: "Zagros Energy", plan: "yearly", amountMinor: 250_000, currency: "USD", at: ago(0.3) },
    { id: "o2", who: "Meridian Aid", plan: "monthly", amountMinor: 25_000, currency: "USD", at: ago(2.1) },
    { id: "o3", who: "Omar Faridun", plan: "monthly", amountMinor: 25_000, currency: "USD", at: ago(5.4) },
    { id: "o4", who: "Nineveh Reconstruction", plan: "yearly", amountMinor: 250_000, currency: "USD", at: ago(9.2) },
    { id: "o5", who: "Karwan Ahmed", plan: "monthly", amountMinor: 25_000, currency: "USD", at: ago(14.8) },
  ],
  monthly: [
    { label: labels[0], minor: 25_000, partial: false },
    { label: labels[1], minor: 275_000, partial: false },
    { label: labels[2], minor: 50_000, partial: false },
    { label: labels[3], minor: 300_000, partial: false },
    { label: labels[4], minor: 275_000, partial: false },
    { label: labels[5], minor: 500_000, partial: true },
  ],
  planMix: [
    { plan: "yearly", orders: 3, minor: 750_000 },
    { plan: "monthly", orders: 6, minor: 150_000 },
  ],
  topAccounts: [
    { id: "u2", who: "Zagros Energy", minor: 500_000, currency: "USD", orders: 2 },
    { id: "u4", who: "Nineveh Reconstruction", minor: 250_000, currency: "USD", orders: 1 },
    { id: "u3", who: "Meridian Aid", minor: 75_000, currency: "USD", orders: 3 },
  ],
  };
};

const SAMPLE_ENGAGEMENT: Engagement = {
  renewals: [
    { id: "u3", who: "Meridian Aid", at: ago(-3), daysLeft: 3 },
    { id: "u5", who: "Omar Faridun", at: ago(-8), daysLeft: 8 },
    { id: "u6", who: "Kirkuk Field Office", at: ago(-12), daysLeft: 12 },
  ],
  inbound: [
    { labelKey: "messages", count: 5, prev: 3, href: "/admin/messages" },
    { labelKey: "applications", count: 2, prev: 4, href: "/admin/applications" },
    { labelKey: "accounts", count: 4, prev: 2, href: "/admin/accounts" },
    { labelKey: "checkouts", count: 3, prev: 3, href: "/admin/accounts" },
  ],
};

const sampleActivity = (locale: string): ActivityEvent[] => {
  // Money and dates in the sample feed follow the caller's locale for the same
  // reason the live feed does — a preview that formats differently from the
  // real thing is a preview of the wrong screen.
  const usd = (minor: number) => formatMoney(minor, "USD", locale);
  const day = (daysAgo: number) =>
    formatDate(ago(daysAgo), locale, { month: "short", day: "numeric" });

  return [
  { id: "s1", kind: "payment", titleKey: "payment", detail: `Zagros Energy · yearly · ${usd(250_000)}`, at: ago(0.3), href: "/admin/accounts", tone: "clear" },
  { id: "s2", kind: "message", titleKey: "message", detail: "Layla Hassan · Zagros Energy", at: ago(0.4), href: "/admin/messages", tone: "gold" },
  { id: "s3", kind: "map_edit", titleKey: "map_edit", detail: "Kirkuk · Operations", at: ago(0.5), href: "/admin/intelligence", tone: "critical" },
  { id: "s4", kind: "report", titleKey: "report", detail: `${day(0.7)} · Analyst`, at: ago(0.7), href: "/admin/sources", tone: "elevated" },
  { id: "s5", kind: "signup", titleKey: "signup", detail: "Omar Faridun", at: ago(1.1), href: "/admin/accounts", tone: "gold" },
  { id: "s6", kind: "application", titleKey: "application", detail: "Karwan Ahmed · Static Security Officer", at: ago(1.3), href: "/admin/applications", tone: "muted" },
  { id: "s7", kind: "checkout", titleKey: "checkout", detail: `Meridian Aid · monthly · ${usd(25_000)}`, at: ago(1.6), href: "/admin/accounts", tone: "elevated" },
  { id: "s8", kind: "map_edit", titleKey: "map_draft", detail: "Sulaymaniyah · Analyst", at: ago(1.9), href: "/admin/intelligence", tone: "muted" },
  { id: "s9", kind: "payment", titleKey: "payment", detail: `Meridian Aid · monthly · ${usd(25_000)}`, at: ago(2.1), href: "/admin/accounts", tone: "clear" },
  { id: "s10", kind: "message", titleKey: "message", detail: "Sarah Duncan · Meridian Aid", at: ago(2.6), href: "/admin/messages", tone: "gold" },
  { id: "s11", kind: "payment_failed", titleKey: "payment_failed", detail: `Nineveh Reconstruction · yearly · ${usd(250_000)}`, at: ago(3.4), href: "/admin/accounts", tone: "critical" },
  { id: "s12", kind: "map_edit", titleKey: "map_edit", detail: "Baghdad · Operations", at: ago(3.8), href: "/admin/intelligence", tone: "elevated" },
  { id: "s13", kind: "application", titleKey: "application", detail: "Noor Al-Jubouri · Medevac Paramedic", at: ago(4.2), href: "/admin/applications", tone: "muted" },
  { id: "s14", kind: "report", titleKey: "report", detail: `${day(4.9)} · Operations`, at: ago(4.9), href: "/admin/sources", tone: "elevated" },
  { id: "s15", kind: "payment", titleKey: "payment", detail: `Omar Faridun · monthly · ${usd(25_000)}`, at: ago(5.4), href: "/admin/accounts", tone: "clear" },
  { id: "s16", kind: "signup", titleKey: "signup", detail: "ops@zagros.example.com", at: ago(6.1), href: "/admin/accounts", tone: "gold" },
  { id: "s17", kind: "map_edit", titleKey: "map_edit", detail: "Mosul · Analyst", at: ago(7.0), href: "/admin/intelligence", tone: "elevated" },
  { id: "s18", kind: "payment", titleKey: "payment", detail: `Nineveh Reconstruction · yearly · ${usd(250_000)}`, at: ago(9.2), href: "/admin/accounts", tone: "clear" },
  { id: "s19", kind: "message", titleKey: "message", detail: "Rêbwar Ali · Rwanga Foundation", at: ago(10.1), href: "/admin/messages", tone: "gold" },
  { id: "s20", kind: "signup", titleKey: "signup", detail: "Karwan Ahmed", at: ago(11.3), href: "/admin/accounts", tone: "gold" },
  { id: "s21", kind: "report", titleKey: "report", detail: `${day(11.6)} · Analyst`, at: ago(11.6), href: "/admin/sources", tone: "elevated" },
  { id: "s22", kind: "map_edit", titleKey: "map_edit", detail: "Erbil · Operations", at: ago(12.4), href: "/admin/intelligence", tone: "clear" },
  { id: "s23", kind: "checkout", titleKey: "checkout", detail: `Rwanga Foundation · yearly · ${usd(250_000)}`, at: ago(13.0), href: "/admin/accounts", tone: "elevated" },
  { id: "s24", kind: "application", titleKey: "application", detail: "Dilan Aziz · K9 Handler", at: ago(14.8), href: "/admin/applications", tone: "muted" },
  ];
};
