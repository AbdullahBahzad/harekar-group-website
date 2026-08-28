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

/**
 * A stored report as the console reads it back.
 *
 * Lives here rather than beside the component that renders it because the
 * server reads this shape too — `lib/dashboard-reports.ts` was importing it
 * from `ReportConsole`, a `"use client"` module, which pointed the dependency
 * the wrong way round: a server-only data function should not name a client
 * component to describe its own return type. Type-only imports erase at
 * compile time so nothing shipped, but the next person to add a runtime import
 * on that line would have pulled the whole console into the server bundle.
 *
 * The dates are strings, not `Date`s: these rows cross into a client component,
 * and a `Date` cannot make that trip.
 */
export type ConsoleReport = {
  id: string;
  date: string;
  kurdistanThreat: ThreatLevel;
  iraqThreat: ThreatLevel;
  politicalKurdistan: string | null;
  politicalIraq: string | null;
  weather: string | null;
  content: ReportContent;
  createdAt: string;
  createdByName: string | null;
};

export type RawNewsInput = {
  url: string;
  notes: string;
  region: Region;
};
