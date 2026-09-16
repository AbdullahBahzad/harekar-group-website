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

/**
 * The direction a governorate's risk rating has moved since the prior
 * report — orthogonal to the rating itself, the same way `MarkerSeverity`
 * and `MarkerAccess` vary independently on the intelligence map.
 */
export const RISK_TRENDS = ["RISING", "STABLE", "EASING"] as const;
export type RiskTrend = (typeof RISK_TRENDS)[number];

/**
 * Iraq's 19 governorates, grouped the way the report's own regional
 * sections read — Baghdad and Basra stand alone, the rest cluster into
 * central, southern, northern and the Kurdistan Region.
 */
export const REGION_GROUPS = [
  "BAGHDAD",
  "CENTRAL",
  "SOUTHERN",
  "BASRA",
  "NORTHERN",
  "KURDISTAN_REGION",
] as const;
export type RegionGroup = (typeof REGION_GROUPS)[number];

export const GOVERNORATES = [
  { key: "BAGHDAD", group: "BAGHDAD" },
  { key: "WASIT", group: "CENTRAL" },
  { key: "SALAH_AL_DIN", group: "CENTRAL" },
  { key: "DIYALA", group: "CENTRAL" },
  { key: "ANBAR", group: "CENTRAL" },
  { key: "BABIL", group: "CENTRAL" },
  { key: "KARBALA", group: "CENTRAL" },
  { key: "NAJAF", group: "SOUTHERN" },
  { key: "QADISIYAH", group: "SOUTHERN" },
  { key: "MUTHANNA", group: "SOUTHERN" },
  { key: "DHI_QAR", group: "SOUTHERN" },
  { key: "MAYSAN", group: "SOUTHERN" },
  { key: "BASRA", group: "BASRA" },
  { key: "NINAWA", group: "NORTHERN" },
  { key: "KIRKUK", group: "NORTHERN" },
  { key: "ERBIL", group: "KURDISTAN_REGION" },
  { key: "SULAYMANIYAH", group: "KURDISTAN_REGION" },
  { key: "DUHOK", group: "KURDISTAN_REGION" },
  { key: "HALABJA", group: "KURDISTAN_REGION" },
] as const satisfies { key: string; group: RegionGroup }[];
export type GovernorateKey = (typeof GOVERNORATES)[number]["key"];

/** One row of the governorate risk matrix. */
export type GovernorateRiskEntry = {
  governorate: GovernorateKey;
  risk: ThreatLevel;
  trend: RiskTrend;
  /** What is driving the rating — the "why", one or two sentences. */
  driver: string;
};

/** Shape of `DailyReport.content` in the database. */
export type ReportContent = {
  items: ReportNewsItem[];
  /**
   * Optional: reports saved before this matrix existed have none, and an
   * analyst may still choose to skip it for a quiet week.
   */
  governorates?: GovernorateRiskEntry[];
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
