import type { Prisma, ReportEvent } from "@prisma/client";
import {
  EVENT_CLASSIFICATIONS,
  EVENT_SEVERITIES,
  GOVERNORATES,
  REGIONS,
  type EventClassification,
  type EventSeverity,
  type GovernorateKey,
  type GovernorateRiskEntry,
  type Region,
  type ReportContent,
  type ReportNewsItem,
} from "@/lib/report-shape";

/**
 * The one place a stored Daily Security Report becomes `ReportContent`.
 *
 * Every reader — console, portal, PDF, public teaser, Ask — loads reports with
 * `REPORT_WITH_EVENTS` and passes the row through `reportContentOf`, so the
 * report's items always come from its `ReportEvent` rows and never from the
 * legacy `items` array some old rows still carry in `content`.
 */
export const REPORT_WITH_EVENTS = {
  events: { orderBy: { position: "asc" } },
} as const satisfies Prisma.DailyReportInclude;

const isRegion = (value: string): value is Region =>
  (REGIONS as readonly string[]).includes(value);
const isClassification = (value: string): value is EventClassification =>
  (EVENT_CLASSIFICATIONS as readonly string[]).includes(value);
const isSeverity = (value: string): value is EventSeverity =>
  (EVENT_SEVERITIES as readonly string[]).includes(value);
const isGovernorate = (value: string): value is GovernorateKey =>
  GOVERNORATES.some((g) => g.key === value);

export function eventToItem(event: ReportEvent): ReportNewsItem {
  return {
    title: event.title,
    body: event.body,
    url: event.sourceUrl,
    region: isRegion(event.region) ? event.region : "IRAQ",
    category: event.category,
    classification:
      event.classification && isClassification(event.classification)
        ? event.classification
        : null,
    severity: event.severity && isSeverity(event.severity) ? event.severity : null,
    shortSummary: event.shortSummary,
    governorate:
      event.governorate && isGovernorate(event.governorate)
        ? event.governorate
        : null,
    district: event.district,
    area: event.area,
    latitude: event.latitude,
    longitude: event.longitude,
  };
}

export function reportContentOf(row: {
  content: Prisma.JsonValue;
  events: ReportEvent[];
}): ReportContent {
  const stored = (row.content ?? {}) as { governorates?: GovernorateRiskEntry[] };
  return {
    items: row.events.map(eventToItem),
    governorates: stored.governorates,
  };
}
