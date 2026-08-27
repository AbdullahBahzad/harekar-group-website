/**
 * The vocabulary of a daily report, shared by the browser and the server.
 *
 * Split out of `reports.ts` because that module reaches for `node:dns` and the
 * Anthropic SDK at import time. `ReportConsole` is a client component and needs
 * these constants to render its selects — importing them from `reports.ts`
 * pulled the whole server-only drafting path into the browser bundle, which
 * does not resolve and takes the reports station down with it.
 *
 * Nothing here may import anything server-only. That is the entire point.
 */

export const THREAT_LEVELS = ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const;
export type ThreatLevel = (typeof THREAT_LEVELS)[number];

export const REGIONS = ["KURDISTAN", "IRAQ"] as const;
export type Region = (typeof REGIONS)[number];

export type ReportNewsItem = {
  title: string;
  body: string;
  url: string | null;
  region: Region;
};

/** Shape of `DailyReport.content` in the database. */
export type ReportContent = {
  items: ReportNewsItem[];
};

export type RawNewsInput = {
  url: string;
  notes: string;
  region: Region;
};
