import { prisma } from "@/lib/prisma";

export type PortalStats = {
  total: number;
  open: number;
  bySeverity: { severity: "CLEAR" | "ELEVATED" | "CRITICAL"; count: number }[];
  /** Top provinces by incident count, highest first. Markers with no
   * province recorded are folded out rather than shown as a false "top"
   * location. */
  byProvince: { province: string; count: number }[];
  /** One count per day for the trailing 14 days (oldest first), each day's
   * key an ISO date (`YYYY-MM-DD`) in UTC. */
  dailyTrend: { date: string; count: number }[];
};

const TREND_DAYS = 14;
const TOP_PROVINCES = 8;

/**
 * Aggregate counts for the portal's Statistics page.
 *
 * Computed in one pass over the published markers rather than several
 * `groupBy` queries: the table is a security team's own register, not a
 * high-volume event log, so pulling the (small) published set once and
 * folding it in JavaScript is simpler to get right than four separate
 * queries — and just as fast at this scale.
 */
export async function getPortalStats(): Promise<PortalStats> {
  const rows = await prisma.intelMarker.findMany({
    where: { published: true },
    select: {
      severity: true,
      province: true,
      resolved: true,
      occurredAt: true,
      createdAt: true,
    },
  });

  const severityCount = { CLEAR: 0, ELEVATED: 0, CRITICAL: 0 };
  const provinceCount = new Map<string, number>();
  const dayCount = new Map<string, number>();
  let open = 0;

  const today = new Date();
  const trendStart = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - (TREND_DAYS - 1),
    ),
  );
  for (let i = 0; i < TREND_DAYS; i++) {
    const day = new Date(trendStart);
    day.setUTCDate(day.getUTCDate() + i);
    dayCount.set(day.toISOString().slice(0, 10), 0);
  }

  for (const row of rows) {
    severityCount[row.severity] += 1;
    if (!row.resolved) open += 1;

    if (row.province) {
      provinceCount.set(row.province, (provinceCount.get(row.province) ?? 0) + 1);
    }

    const when = row.occurredAt ?? row.createdAt;
    const key = when.toISOString().slice(0, 10);
    if (dayCount.has(key)) dayCount.set(key, (dayCount.get(key) ?? 0) + 1);
  }

  return {
    total: rows.length,
    open,
    bySeverity: (["CLEAR", "ELEVATED", "CRITICAL"] as const).map((severity) => ({
      severity,
      count: severityCount[severity],
    })),
    byProvince: Array.from(provinceCount, ([province, count]) => ({
      province,
      count,
    }))
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_PROVINCES),
    dailyTrend: Array.from(dayCount, ([date, count]) => ({ date, count })),
  };
}
