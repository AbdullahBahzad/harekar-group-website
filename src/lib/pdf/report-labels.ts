import type {
  EventClassification,
  GovernorateKey,
  ReportCategory,
  ReportNewsItem,
} from "@/lib/report-shape";

/**
 * English wording and colours for report PDFs. The PDFs go to clients in
 * English whatever language the console runs in, so these are not translated.
 */

/** Section headings, worded as in the client's reporting spec. */
export const CATEGORY_HEADING: Record<ReportCategory, string> = {
  SECURITY: "Security Developments",
  ECONOMIC: "Economic Developments",
  MINISTERIAL: "Ministerial Activities",
  GOVERNANCE_POLITICAL: "Governance and Political Activities",
  LOCAL_INTERNATIONAL: "Local and International Interests",
};

/** Heading for events filed before categories existed. */
export const UNCATEGORISED_HEADING = "General";

/** One colour per section, shared by the map pins and the section bars. */
export const CATEGORY_COLOR: Record<ReportCategory, string> = {
  SECURITY: "#b23b34",
  ECONOMIC: "#356d9e",
  MINISTERIAL: "#6b5aa6",
  GOVERNANCE_POLITICAL: "#a8792a",
  LOCAL_INTERNATIONAL: "#3f7d55",
};
export const UNCATEGORISED_COLOR = "#77736a";

export function categoryColor(category: ReportCategory | null | undefined): string {
  return category ? CATEGORY_COLOR[category] : UNCATEGORISED_COLOR;
}

export const CLASSIFICATION_LABEL: Record<EventClassification, string> = {
  ATTACK: "Attack",
  EXPLOSION: "Explosion / IED",
  KIDNAPPING: "Kidnapping",
  ARREST: "Arrest",
  MILITARY_OPERATION: "Military operation",
  PROTEST: "Protest",
  CRIME: "Crime",
  ACCIDENT: "Accident",
  NATURAL_DISASTER: "Natural disaster",
  POLITICAL: "Political",
  ECONOMIC: "Economic",
  OTHER: "Other",
};

export const GOVERNORATE_LABEL: Record<GovernorateKey, string> = {
  BAGHDAD: "Baghdad",
  WASIT: "Wasit",
  SALAH_AL_DIN: "Salah al-Din",
  DIYALA: "Diyala",
  ANBAR: "Anbar",
  BABIL: "Babil",
  KARBALA: "Karbala",
  NAJAF: "Najaf",
  QADISIYAH: "Qadisiyah",
  MUTHANNA: "Muthanna",
  DHI_QAR: "Dhi Qar",
  MAYSAN: "Maysan",
  BASRA: "Basra",
  NINAWA: "Ninawa",
  KIRKUK: "Kirkuk",
  ERBIL: "Erbil",
  SULAYMANIYAH: "Sulaymaniyah",
  DUHOK: "Duhok",
  HALABJA: "Halabja",
};

/** "Hawija, Kirkuk" — most specific first; blanks and repeats dropped. */
export function locationLine(item: ReportNewsItem): string {
  return joinPlace([
    item.area,
    item.district,
    item.governorate ? GOVERNORATE_LABEL[item.governorate] : null,
  ]);
}

/** Joins place names, skipping blanks and any name already given (an area
 * and district are often the same town). Shared with the portal. */
export function joinPlace(parts: (string | null | undefined)[]): string {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const raw of parts) {
    const part = raw?.trim();
    if (!part || seen.has(part.toLowerCase())) continue;
    seen.add(part.toLowerCase());
    kept.push(part);
  }
  return kept.join(", ");
}
