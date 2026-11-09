import {
  REPORT_CATEGORIES,
  type ReportCategory,
  type ReportNewsItem,
} from "@/lib/report-shape";

/**
 * The order a report's events are printed in, and their numbers.
 *
 * The five sections in the spec's order, Kurdistan events first within each,
 * then anything filed before sections existed. Numbers run 1, 2, 3… down that
 * printed order, and the PDF, the portal and every event map all number from
 * here, so "event 4" means the same event everywhere.
 *
 * Client-safe: no server imports.
 */

export type NumberedEvent = { number: number; item: ReportNewsItem };
export type ReportSection = { category: ReportCategory | null; events: NumberedEvent[] };

export function orderReportEvents(items: ReportNewsItem[]): {
  sections: ReportSection[];
  /** Every event, in printed order. */
  numbered: NumberedEvent[];
} {
  let next = 1;
  const sections = ([...REPORT_CATEGORIES, null] as (ReportCategory | null)[])
    .map((category) => ({
      category,
      items: items
        .filter((item) => (item.category ?? null) === category)
        // Stable: within each region the analyst's own order is kept.
        .sort(
          (a, b) => Number(b.region === "KURDISTAN") - Number(a.region === "KURDISTAN"),
        ),
    }))
    .filter((section) => section.items.length > 0)
    .map(({ category, items: sectionItems }) => ({
      category,
      events: sectionItems.map((item) => ({ number: next++, item })),
    }));

  return { sections, numbered: sections.flatMap((section) => section.events) };
}
