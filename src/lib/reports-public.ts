import { prisma } from "@/lib/prisma";
import type { ReportContent, ThreatLevel } from "@/lib/report-shape";

/**
 * Daily Security Reports, as a customer receives them.
 *
 * The console has drafted, reviewed and stored these since the reports feature
 * shipped, and until now nothing outside the console ever read the table — the
 * Pro tier's headline deliverable was being written and never delivered. This
 * is the read side that was missing.
 *
 * The gate is the shape of the return value, not a flag the caller may ignore:
 * an unentitled reader gets `PublicReportSummary`, which has no field capable
 * of carrying the write-up. There is no version of this function that returns
 * the text to someone who should not have it, so no call site can get it wrong.
 */

/** What anyone may see: that a report exists, when, and its headline posture. */
export type PublicReportSummary = {
  id: string;
  /** ISO date string — a `Date` cannot cross into a client component. */
  date: string;
  kurdistanThreat: ThreatLevel;
  iraqThreat: ThreatLevel;
  itemCount: number;
};

/** What a Pro subscriber may see: the above, plus the actual assessment. */
export type PublicReport = PublicReportSummary & {
  politicalKurdistan: string | null;
  politicalIraq: string | null;
  weather: string | null;
  content: ReportContent;
};

/**
 * The teaser list, for readers without Pro.
 *
 * Deliberately still shows something. A subscription page that proves the
 * product exists and is current — five dated bulletins, this week's posture —
 * sells better than an empty box, and none of it is the thing being sold.
 */
export async function getReportSummaries(
  take = 8,
): Promise<PublicReportSummary[]> {
  try {
    const rows = await prisma.dailyReport.findMany({
      orderBy: { date: "desc" },
      take,
      // `content` is fetched only to count its items; it never leaves this
      // function for an unentitled reader.
      select: {
        id: true,
        date: true,
        kurdistanThreat: true,
        iraqThreat: true,
        content: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      date: row.date.toISOString(),
      kurdistanThreat: row.kurdistanThreat as ThreatLevel,
      iraqThreat: row.iraqThreat as ThreatLevel,
      itemCount: ((row.content as ReportContent | null)?.items ?? []).length,
    }));
  } catch (error) {
    // A reports outage must not take the intelligence page down with it.
    console.error("Could not read daily reports", error);
    return [];
  }
}

/** The full bulletins, for a reader the caller has already verified has Pro. */
export async function getFullReports(take = 8): Promise<PublicReport[]> {
  try {
    const rows = await prisma.dailyReport.findMany({
      orderBy: { date: "desc" },
      take,
    });

    return rows.map((row) => ({
      id: row.id,
      date: row.date.toISOString(),
      kurdistanThreat: row.kurdistanThreat as ThreatLevel,
      iraqThreat: row.iraqThreat as ThreatLevel,
      politicalKurdistan: row.politicalKurdistan,
      politicalIraq: row.politicalIraq,
      weather: row.weather,
      content: (row.content as ReportContent | null) ?? { items: [] },
      itemCount: ((row.content as ReportContent | null)?.items ?? []).length,
    }));
  } catch (error) {
    console.error("Could not read daily reports", error);
    return [];
  }
}
