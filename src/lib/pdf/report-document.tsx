import type { ReactNode } from "react";
import { Document, Image, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { ACRONYM_COLUMNS } from "./acronyms";
import { EventMap } from "./event-map";
import { orderReportEvents } from "@/lib/report-order";
import {
  CATEGORY_HEADING,
  CLASSIFICATION_LABEL,
  GOVERNORATE_LABEL,
  SEVERITY_LABEL,
  UNCATEGORISED_HEADING,
  locationLine,
} from "./report-labels";
import {
  GOVERNORATES,
  REGION_GROUPS,
  type GovernorateRiskEntry,
  type RegionGroup,
  type ReportNewsItem,
  type RiskTrend,
  type ThreatLevel,
} from "@/lib/report-shape";

/**
 * The Daily Security Report PDF, laid out to match Harekar's own Word
 * template (the sample reports the client sent): the cover with the logo
 * card, posture block, Erbil Citadel photo, acronym grid and emergency
 * numbers; then the body as one bordered table — a lavender heading row, a
 * grey "Date:"/"Title:" column and green content cells — ending in the
 * contact block.
 *
 * The parts the client's written spec adds (the five sections, "Short
 * Summaries of Major Events in Kurdistan", the event map, the governorate
 * matrix) are set in the same table style, as further lavender heading rows.
 *
 * Colours are the template's own, read from the sample PDFs. The font is
 * Caladea, which is metric-compatible with the template's Cambria (Cambria
 * itself is not licensed for embedding here) — see `render-report-pdf.ts`.
 *
 * This module only lays out approved text; it makes no editorial decisions.
 */

export type ReportPdfItem = ReportNewsItem;

export type ReportPdfProps = {
  /** The report day (UTC midnight). */
  date: Date;
  /** `2 November 2026`, for the map page. */
  dateLabel: string;
  kurdistanThreat: ThreatLevel;
  iraqThreat: ThreatLevel;
  politicalKurdistan: string | null;
  politicalIraq: string | null;
  weather: string | null;
  /** The analyst's overview, printed ahead of the events when written. */
  executiveSummary: string | null;
  items: ReportPdfItem[];
  governorates: GovernorateRiskEntry[];
  /** The "with sources" version prints each event's source link. */
  withSources: boolean;
  /** Raw image bytes, read from disk by the caller — see `render-report-pdf.ts`. */
  logo: Buffer;
  coverPhoto: Buffer;
};

/* ---- the template's palette (from the sample PDFs) ------------------------ */
const GREEN = "#eaf1dd";
const LAVENDER = "#e5dfec";
const GREY = "#f2f2f2";
const LINK = "#1f5080";
const INK = "#000000";
const SHADOW = "#cfcfcf";

const FONT = "Caladea";

const THREAT_LABEL: Record<ThreatLevel, string> = {
  LOW: "LOW",
  MODERATE: "MODERATE",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
};

const REGION_GROUP_LABEL: Record<RegionGroup, string> = {
  BAGHDAD: "Baghdad",
  CENTRAL: "Central Iraq",
  SOUTHERN: "Southern Iraq",
  BASRA: "Basra",
  NORTHERN: "Northern Iraq",
  KURDISTAN_REGION: "Kurdistan Region of Iraq",
};

const TREND_LABEL: Record<RiskTrend, string> = { RISING: "Rising", STABLE: "Stable", EASING: "Easing" };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = (n: number) => String(n).padStart(2, "0");
/** "November 02.2026." — the template's reporting-period style. */
const periodLabel = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${pad(d.getUTCDate())}.${d.getUTCFullYear()}.`;
/** "02/11/2026." — the template's Date: cell. */
const dayLabel = (d: Date) => `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}.`;

const styles = StyleSheet.create({
  /* cover */
  cover: { fontFamily: FONT, color: INK, position: "relative" },
  logoShadow: { position: "absolute", left: 192, top: 10, width: 200, height: 78, backgroundColor: SHADOW },
  logoCard: {
    position: "absolute",
    left: 188,
    top: 6,
    width: 200,
    height: 78,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: { width: 176, height: 68, objectFit: "contain" },
  titleBlock: { position: "absolute", left: 37, top: 92, width: 270 },
  coverTitle: { fontSize: 13, lineHeight: 1.3 },
  postureBlock: { position: "absolute", left: 28, top: 158, width: 280 },
  postureHeading: { fontSize: 10, fontWeight: "bold", textDecoration: "underline", marginTop: 13, marginBottom: 8 },
  postureLine: { fontSize: 10, marginBottom: 12 },
  bold: { fontWeight: "bold" },
  photoShadow: { position: "absolute", left: 319, top: 99, width: 252, height: 239, backgroundColor: SHADOW },
  photo: { position: "absolute", left: 315, top: 95, width: 252, height: 239, objectFit: "cover" },
  rule: { position: "absolute", left: 34, top: 344, width: 529, borderBottomWidth: 1.3, borderBottomColor: INK },
  acronymTitle: { position: "absolute", left: 32, top: 361, fontSize: 10, fontWeight: "bold" },
  acronymTable: {
    position: "absolute",
    left: 30,
    top: 380,
    width: 554,
    flexDirection: "row",
    borderWidth: 0.75,
    borderColor: INK,
  },
  acronymCol: { borderRightWidth: 0.75, borderRightColor: INK },
  acronymRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: INK,
    paddingVertical: 1.4,
    paddingHorizontal: 3,
  },
  acronymTerm: { fontSize: 7.2, fontWeight: "bold" },
  acronymDef: { fontSize: 7.2, color: "#404040" },
  emergency: { position: "absolute", left: 424, top: 690, fontFamily: "Times-Roman" },
  emergencyLine: { fontSize: 10.5, lineHeight: 1.25 },
  emergencyEmail: { fontSize: 10.5, color: LINK },

  /* body table */
  body: { fontFamily: FONT, color: INK, paddingTop: 14, paddingBottom: 18, paddingHorizontal: 14 },
  table: { borderTopWidth: 0.75, borderLeftWidth: 0.75, borderRightWidth: 0.75, borderColor: INK },
  headRow: {
    backgroundColor: LAVENDER,
    borderBottomWidth: 0.75,
    borderBottomColor: INK,
    paddingVertical: 3,
  },
  headText: { fontSize: 11.5, fontWeight: "bold", textAlign: "center" },
  row: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: INK },
  labelCell: {
    width: 38,
    backgroundColor: GREY,
    borderRightWidth: 0.75,
    borderRightColor: INK,
    paddingTop: 4,
    paddingLeft: 3,
  },
  labelText: { fontSize: 8.5, fontWeight: "bold" },
  contentCell: { flex: 1, backgroundColor: GREEN, paddingTop: 4, paddingBottom: 6, paddingHorizontal: 6 },
  dateText: { fontSize: 10, fontWeight: "bold" },
  item: { marginBottom: 9 },
  itemTitle: { fontSize: 9.6, fontWeight: "bold", marginBottom: 1 },
  itemMeta: { fontSize: 7.8, fontStyle: "italic", color: "#4a442a", marginBottom: 1.5 },
  itemBody: { fontSize: 8.4, lineHeight: 1.22, textAlign: "justify" },
  itemUrl: { fontSize: 8, color: LINK, marginTop: 1 },
  bulletRow: { flexDirection: "row", marginBottom: 4 },
  bullet: { fontSize: 8.4, width: 10 },
  bulletText: { fontSize: 8.4, lineHeight: 1.22, flex: 1, textAlign: "justify" },
  summaryText: { fontSize: 8.6, lineHeight: 1.25, textAlign: "justify", marginBottom: 4 },
  contact: { marginTop: 16 },
  contactLine: { fontSize: 11, fontWeight: "bold", lineHeight: 1.25 },
  contactEmail: { fontSize: 11, fontWeight: "bold", color: LINK },

  /* matrix */
  matrixGroup: { fontSize: 8.5, fontWeight: "bold", marginTop: 6, marginBottom: 2 },
  matrixHead: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: INK, paddingBottom: 2 },
  matrixHeadCell: { fontSize: 7.4, fontWeight: "bold" },
  matrixRow: { flexDirection: "row", borderBottomWidth: 0.4, borderBottomColor: "#9a9a9a", paddingVertical: 2 },
  colGov: { width: "20%", fontSize: 8, fontWeight: "bold" },
  colRisk: { width: "14%", fontSize: 8, fontWeight: "bold" },
  colTrend: { width: "13%", fontSize: 8 },
  colDriver: { width: "53%", fontSize: 7.8, lineHeight: 1.2 },
});

/* ---- table building blocks ---------------------------------------------------- */

function HeadRow({ children }: { children: string }) {
  return (
    <View style={styles.headRow} wrap={false}>
      <Text style={styles.headText}>{children}</Text>
    </View>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.labelCell}>
        <Text style={styles.labelText}>{label}</Text>
      </View>
      <View style={styles.contentCell}>{children}</View>
    </View>
  );
}

/**
 * An event's line in "Short Summaries of Major Events in Kurdistan": the
 * analyst's own short summary when written, otherwise the write-up's first
 * two sentences.
 */
function shortSummaryOf(item: ReportNewsItem): string {
  const own = item.shortSummary?.trim();
  if (own) return own;
  const sentences = item.body.match(/[^.!?]+[.!?]+(\s|$)/g);
  return sentences ? sentences.slice(0, 2).join("").trim() : item.body.trim();
}

function Contact() {
  return (
    <View style={styles.contact} wrap={false}>
      <Text style={styles.contactLine}>Harekar For Private Guarding</Text>
      <Text style={styles.contactLine}>Contact Information</Text>
      <Text style={styles.contactLine}>Dream City 100m road</Text>
      <Text style={styles.contactLine}>Erbil, Kurdistan Region of Iraq</Text>
      <Text style={styles.contactLine}>Phone Iraq +964 750 445 7862 - +964 750 4580092</Text>
      <Text style={styles.contactLine}>
        Email: <Text style={styles.contactEmail}>operationsmanager@harekargroup.com</Text>
      </Text>
    </View>
  );
}

export function ReportDocument({
  date,
  dateLabel,
  kurdistanThreat,
  iraqThreat,
  politicalKurdistan,
  politicalIraq,
  weather,
  executiveSummary,
  items,
  governorates,
  withSources,
  logo,
  coverPhoto,
}: ReportPdfProps) {
  // Sections, printed order and numbering are shared with the portal and the
  // event map — see `orderReportEvents`.
  const { sections, numbered } = orderReportEvents(items);
  const kurdistanSummaries = numbered.filter(({ item }) => item.region === "KURDISTAN");
  const hasMap = numbered.some(({ item }) => item.governorate || item.latitude != null);

  const governorateByGroup = REGION_GROUPS.map((group) => ({
    group,
    rows: GOVERNORATES.filter((g) => g.group === group)
      .map(({ key }) => governorates.find((row) => row.governorate === key))
      .filter((row): row is GovernorateRiskEntry => Boolean(row)),
  })).filter((group) => group.rows.length > 0);

  return (
    <Document
      title={`Daily Security Report — ${dateLabel}`}
      author="Harekar For Private Guarding"
    >
      {/* ---- cover ------------------------------------------------------- */}
      <Page size="A4" style={styles.cover}>
        <View style={styles.logoShadow} />
        <View style={styles.logoCard}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's <Image>, not an <img>; it has no alt prop */}
          <Image src={logo} style={styles.logoImage} />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.coverTitle}>Daily Security Report Update - Kurdistan</Text>
          <Text style={styles.coverTitle}>Harekar For Private Guarding</Text>
          <Text style={styles.coverTitle}>Reporting Period: {periodLabel(date)}</Text>
        </View>

        <View style={styles.postureBlock}>
          <Text style={styles.postureHeading}>SECURITY HIGHLIGHTED</Text>
          <Text style={styles.postureLine}>
            KURDISTAN THREAT LEVEL: <Text style={styles.bold}>{THREAT_LABEL[kurdistanThreat]}</Text>
          </Text>
          <Text style={styles.postureLine}>
            IRAQ WIDE THREAT LEVEL: <Text style={styles.bold}>{THREAT_LABEL[iraqThreat]}</Text>
          </Text>
          <Text style={styles.postureHeading}>POLITICAL HIGHLIGHTED:</Text>
          <Text style={styles.postureLine}>
            POLITICAL SITUATION KURDISTAN:{" "}
            <Text style={styles.bold}>{(politicalKurdistan || "—").toUpperCase()}</Text>
          </Text>
          <Text style={styles.postureLine}>
            POLITICAL SITUATION IRAQ WIDE:{" "}
            <Text style={styles.bold}>{(politicalIraq || "—").toUpperCase()}</Text>
          </Text>
          <Text style={styles.postureHeading}>
            WEATHER CONDITIONS: {weather ? <Text style={{ textDecoration: "none", fontWeight: "normal" }}>{weather}</Text> : null}
          </Text>
        </View>

        <View style={styles.photoShadow} />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's <Image>, not an <img>; it has no alt prop */}
        <Image src={coverPhoto} style={styles.photo} />

        <View style={styles.rule} />
        <Text style={styles.acronymTitle}>ACRONYMS</Text>
        <View style={styles.acronymTable}>
          {ACRONYM_COLUMNS.map((column, i) => (
            <View
              key={i}
              style={[
                styles.acronymCol,
                { width: ["32.5%", "30.2%", "37.3%"][i] },
                i === ACRONYM_COLUMNS.length - 1 ? { borderRightWidth: 0 } : {},
              ]}
            >
              {column.map((entry, j) => (
                <View
                  key={entry.term + j}
                  style={[styles.acronymRow, j === column.length - 1 ? { borderBottomWidth: 0 } : {}]}
                >
                  <Text style={styles.acronymTerm}>{entry.term}</Text>
                  <Text style={styles.acronymDef}> - {entry.definition}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.emergency}>
          <Text style={styles.emergencyLine}>SECURITY EMERGENCY #</Text>
          <Text style={styles.emergencyLine}>07504457862 – 07504580092</Text>
          <Text style={styles.emergencyEmail}>operations@harekargroup.com</Text>
        </View>
      </Page>

      {/* ---- the report table ----------------------------------------------- */}
      <Page size="A4" style={styles.body}>
        <View style={styles.table}>
          <HeadRow>Kurdistan Region of Iraq</HeadRow>
          <Row label="Date:">
            <Text style={styles.dateText}>{dayLabel(date)}</Text>
          </Row>

          {executiveSummary?.trim() && (
            <>
              <HeadRow>Executive Summary</HeadRow>
              <Row label="">
                {executiveSummary
                  .trim()
                  .split(/\n\s*\n/)
                  .map((paragraph, i) => (
                    <Text key={i} style={styles.summaryText}>
                      {paragraph.trim()}
                    </Text>
                  ))}
              </Row>
            </>
          )}

          {kurdistanSummaries.length > 0 && (
            <>
              <HeadRow>Short Summaries of Major Events in Kurdistan</HeadRow>
              <Row label="Title:">
                {kurdistanSummaries.map(({ item, number }) => (
                  <View key={number} style={styles.bulletRow} wrap={false}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>{shortSummaryOf(item)}</Text>
                  </View>
                ))}
              </Row>
            </>
          )}

          {sections.map(({ category, events }) => (
            <View key={category ?? "general"}>
              <HeadRow>{category ? CATEGORY_HEADING[category] : UNCATEGORISED_HEADING}</HeadRow>
              <Row label="Title:">
                {events.map(({ item, number }) => {
                  const place = locationLine(item);
                  const kind = [
                    item.severity ? `${SEVERITY_LABEL[item.severity]} severity` : null,
                    item.classification ? CLASSIFICATION_LABEL[item.classification] : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <View key={number} style={styles.item} wrap={false}>
                      <Text style={styles.itemTitle}>
                        {number}. {item.title}
                      </Text>
                      {(place || kind) && (
                        <Text style={styles.itemMeta}>{[place, kind].filter(Boolean).join("  ·  ")}</Text>
                      )}
                      <Text style={styles.itemBody}>{item.body}</Text>
                      {withSources && item.url && (
                        <Link src={item.url} style={styles.itemUrl}>
                          {item.url}
                        </Link>
                      )}
                    </View>
                  );
                })}
              </Row>
            </View>
          ))}

          <Row label="">
            <Contact />
          </Row>
        </View>
      </Page>

      {/* ---- daily event map -------------------------------------------------- */}
      {hasMap && (
        <Page size="A4" style={styles.body}>
          <View style={styles.table}>
            <HeadRow>Daily Event Map</HeadRow>
            <Row label="Date:">
              <Text style={styles.dateText}>{dayLabel(date)}</Text>
            </Row>
            <Row label="">
              <View style={{ backgroundColor: "#ffffff", padding: 4 }}>
                {/* Sized to the table's content cell, not the full page width. */}
                <EventMap events={numbered} width={494} />
              </View>
            </Row>
          </View>
        </Page>
      )}

      {/* ---- governorate risk matrix -------------------------------------------- */}
      {governorateByGroup.length > 0 && (
        <Page size="A4" style={styles.body}>
          <View style={styles.table}>
            <HeadRow>Governorate Risk Matrix</HeadRow>
            <Row label="Date:">
              <Text style={styles.dateText}>{dayLabel(date)}</Text>
            </Row>
            <Row label="">
              {governorateByGroup.map(({ group, rows }) => (
                <View key={group} wrap={false}>
                  <Text style={styles.matrixGroup}>{REGION_GROUP_LABEL[group]}</Text>
                  <View style={styles.matrixHead}>
                    <Text style={[styles.matrixHeadCell, { width: "20%" }]}>Governorate</Text>
                    <Text style={[styles.matrixHeadCell, { width: "14%" }]}>Risk</Text>
                    <Text style={[styles.matrixHeadCell, { width: "13%" }]}>Trend</Text>
                    <Text style={[styles.matrixHeadCell, { width: "53%" }]}>Driver</Text>
                  </View>
                  {rows.map((row) => (
                    <View key={row.governorate} style={styles.matrixRow} wrap={false}>
                      <Text style={styles.colGov}>{GOVERNORATE_LABEL[row.governorate]}</Text>
                      <Text style={styles.colRisk}>{THREAT_LABEL[row.risk]}</Text>
                      <Text style={styles.colTrend}>{TREND_LABEL[row.trend]}</Text>
                      <Text style={styles.colDriver}>{row.driver || "—"}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </Row>
          </View>
        </Page>
      )}
    </Document>
  );
}
