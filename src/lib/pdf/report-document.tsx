import {
  Document,
  Page,
  View,
  Text,
  Image,
  Link,
  StyleSheet,
} from "@react-pdf/renderer";
import { ACRONYM_COLUMNS } from "./acronyms";
import { EventMap } from "./event-map";
import { orderReportEvents } from "@/lib/report-order";
import {
  CATEGORY_HEADING,
  CLASSIFICATION_LABEL,
  GOVERNORATE_LABEL,
  UNCATEGORISED_HEADING,
  categoryColor,
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
 * The Daily Security Report, laid out as the branded PDF that used to be
 * assembled by hand in a document editor — see `reports.ts` for how the
 * content itself gets drafted and reviewed before it ever reaches here.
 * This module only lays out already-approved text; it makes no editorial
 * decisions of its own.
 */

export type ReportPdfItem = ReportNewsItem;

export type ReportPdfProps = {
  dateLabel: string;
  kurdistanThreat: ThreatLevel;
  iraqThreat: ThreatLevel;
  politicalKurdistan: string | null;
  politicalIraq: string | null;
  weather: string | null;
  /** The analyst's overview — printed ahead of the itemised write-ups. */
  executiveSummary: string | null;
  items: ReportPdfItem[];
  governorates: GovernorateRiskEntry[];
  /** The "with sources" version prints each event's source link; the other
   * version is identical apart from leaving them out. */
  withSources: boolean;
  /** Raw image bytes, read from disk by the caller — see `render-report-pdf.ts`. */
  logo: Buffer;
  coverPhoto: Buffer;
};

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

const TREND_LABEL: Record<RiskTrend, string> = {
  RISING: "Rising",
  STABLE: "Stable",
  EASING: "Easing",
};
/** Same direction sense as the escalation trigger ladder: red rises, green eases. */
const TREND_COLOR: Record<RiskTrend, string> = {
  RISING: "#b23b34",
  STABLE: "#8a7a52",
  EASING: "#4d7a52",
};

const gold = "#a88a4a";
const ink = "#1a1712";

/** Distinct from the brand palette — these read as a risk scale, not gold accents. */
const RISK_COLOR: Record<ThreatLevel, string> = {
  LOW: "#3f7d55",
  MODERATE: "#b58a2e",
  HIGH: "#c06a2c",
  CRITICAL: "#b23b34",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 40,
    paddingHorizontal: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: ink,
  },
  logo: { width: 130, marginBottom: 14 },
  coverRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
  coverText: { flex: 1 },
  coverPhoto: { width: 210, height: 150, objectFit: "cover" },
  h1: { fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  h2: { fontSize: 10, marginBottom: 2 },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textDecoration: "underline",
    marginTop: 10,
    marginBottom: 4,
  },
  statLine: { fontSize: 10, marginBottom: 2 },
  statValue: { fontFamily: "Helvetica-Bold" },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: ink,
    marginTop: 12,
    marginBottom: 10,
  },
  acronymsTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  acronymGrid: { flexDirection: "row", gap: 10, borderWidth: 1, borderColor: "#999" },
  acronymCol: { flex: 1, borderRightWidth: 1, borderRightColor: "#999" },
  acronymRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  acronymTerm: { fontFamily: "Helvetica-Bold", fontSize: 7, width: 42 },
  acronymDef: { fontSize: 7, flex: 1 },
  footer: {
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: ink,
  },
  footerLine: { fontSize: 9, marginBottom: 2 },
  footerEmail: { fontSize: 9, color: gold },

  regionHeading: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#e9e2d3",
    padding: 6,
    marginTop: 14,
    marginBottom: 8,
  },
  dateRow: { fontSize: 9, marginBottom: 8 },
  dateLabel: { fontFamily: "Helvetica-Bold" },
  item: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
  },
  itemTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 5, marginBottom: 2 },
  itemNumber: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#fff",
    paddingVertical: 1.5,
    paddingHorizontal: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  itemTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", flex: 1 },
  itemMeta: { fontSize: 7.5, color: "#6b6559", marginBottom: 3 },
  shortSummaryHeading: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#e9e2d3",
    padding: 6,
    marginTop: 14,
    marginBottom: 8,
  },
  shortSummaryRow: { flexDirection: "row", gap: 5, marginBottom: 5 },
  shortSummaryBullet: { fontSize: 9, width: 8 },
  shortSummaryText: { fontSize: 9, lineHeight: 1.4, flex: 1 },
  categoryHeading: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#fff",
    padding: 6,
    marginTop: 14,
    marginBottom: 8,
  },
  mapTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  mapSubtitle: { fontSize: 9, color: "#555", marginBottom: 10 },
  itemBody: { fontSize: 9, lineHeight: 1.4, marginBottom: 3 },
  itemUrl: { fontSize: 8, color: gold },

  summaryHeading: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#e9e2d3",
    padding: 6,
    marginBottom: 8,
  },
  summaryBody: { fontSize: 9.5, lineHeight: 1.45, marginBottom: 4 },

  contactBlock: { marginTop: 20 },
  contactLine: { fontSize: 9, marginBottom: 2 },
  contactBold: { fontFamily: "Helvetica-Bold" },

  matrixTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 10 },
  matrixGroupLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#e9e2d3",
    padding: 4,
    marginTop: 10,
    marginBottom: 4,
  },
  matrixHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: ink,
    paddingBottom: 3,
    marginBottom: 2,
  },
  matrixHeaderCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#555",
    textTransform: "uppercase",
  },
  matrixRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
    paddingVertical: 3,
  },
  matrixColGovernorate: { width: "20%", fontSize: 8, fontFamily: "Helvetica-Bold" },
  matrixColRisk: { width: "14%" },
  matrixColTrend: { width: "14%" },
  matrixColDriver: { width: "52%", fontSize: 7.5, lineHeight: 1.35 },
  matrixBadge: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#fff",
    paddingVertical: 1.5,
    paddingHorizontal: 5,
    borderRadius: 2,
    alignSelf: "flex-start",
  },
  matrixTrendText: { fontSize: 7.5, fontFamily: "Helvetica-Bold" },
});

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

export function ReportDocument({
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
  // event map — see `orderReportEvents`. Events filed before categories
  // existed print last, under "General"; an empty section is skipped.
  const { sections, numbered } = orderReportEvents(items);

  const kurdistanSummaries = numbered
    .filter(({ item }) => item.region === "KURDISTAN")
    .map(({ item, number }) => ({ number, text: shortSummaryOf(item) }));

  const governorateByGroup = REGION_GROUPS.map((group) => ({
    group,
    rows: GOVERNORATES.filter((g) => g.group === group)
      .map(({ key }) => governorates.find((row) => row.governorate === key))
      .filter((row): row is GovernorateRiskEntry => Boolean(row)),
  })).filter((group) => group.rows.length > 0);

  return (
    <Document
      title={`Daily Security Report — ${dateLabel}`}
      author="Harekar for Private Security & Guarding"
    >
      {/* ---- cover page --------------------------------------------------- */}
      <Page size="A4" style={styles.page}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's <Image>, not an <img>; it has no alt prop */}
        <Image src={logo} style={styles.logo} />

        <View style={styles.coverRow}>
          <View style={styles.coverText}>
            <Text style={styles.h1}>
              Daily Security Report Update - Kurdistan
            </Text>
            <Text style={styles.h2}>
              Harekar For Private Security & Guarding
            </Text>
            <Text style={styles.h2}>Reporting Period: {dateLabel}</Text>

            <Text style={styles.sectionLabel}>SECURITY HIGHLIGHTED</Text>
            <Text style={styles.statLine}>
              KURDISTAN THREAT LEVEL:{" "}
              <Text style={styles.statValue}>
                {THREAT_LABEL[kurdistanThreat]}
              </Text>
            </Text>
            <Text style={styles.statLine}>
              IRAQ WIDE THREAT LEVEL:{" "}
              <Text style={styles.statValue}>{THREAT_LABEL[iraqThreat]}</Text>
            </Text>

            <Text style={styles.sectionLabel}>POLITICAL HIGHLIGHTED</Text>
            <Text style={styles.statLine}>
              POLITICAL SITUATION KURDISTAN:{" "}
              <Text style={styles.statValue}>
                {(politicalKurdistan || "—").toUpperCase()}
              </Text>
            </Text>
            <Text style={styles.statLine}>
              POLITICAL SITUATION IRAQ WIDE:{" "}
              <Text style={styles.statValue}>
                {(politicalIraq || "—").toUpperCase()}
              </Text>
            </Text>

            <Text style={styles.sectionLabel}>WEATHER CONDITIONS</Text>
            <Text style={styles.statLine}>{weather || "—"}</Text>
          </View>

          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's <Image>, not an <img>; it has no alt prop */}
          <Image src={coverPhoto} style={styles.coverPhoto} />
        </View>

        <View style={styles.divider} />

        <Text style={styles.acronymsTitle}>ACRONYMS</Text>
        <View style={styles.acronymGrid}>
          {ACRONYM_COLUMNS.map((column, i) => (
            <View
              key={i}
              style={[
                styles.acronymCol,
                i === ACRONYM_COLUMNS.length - 1
                  ? { borderRightWidth: 0 }
                  : {},
              ]}
            >
              {column.map((entry) => (
                <View key={entry.term} style={styles.acronymRow}>
                  <Text style={styles.acronymTerm}>{entry.term}</Text>
                  <Text style={styles.acronymDef}>{entry.definition}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerLine}>
            SECURITY EMERGENCY # 07504457862 – 07504580092
          </Text>
          <Text style={styles.footerEmail}>operations@harekargroup.com</Text>
        </View>
      </Page>

      {/* ---- governorate risk matrix ---------------------------------------- */}
      {governorateByGroup.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.matrixTitle}>Governorate Risk Matrix</Text>

          {governorateByGroup.map(({ group, rows }) => (
            <View key={group} wrap={false}>
              <Text style={styles.matrixGroupLabel}>
                {REGION_GROUP_LABEL[group]}
              </Text>

              <View style={styles.matrixHeaderRow}>
                <Text style={[styles.matrixHeaderCell, styles.matrixColGovernorate]}>
                  Governorate
                </Text>
                <Text style={[styles.matrixHeaderCell, styles.matrixColRisk]}>
                  Risk
                </Text>
                <Text style={[styles.matrixHeaderCell, styles.matrixColTrend]}>
                  Trend
                </Text>
                <Text style={[styles.matrixHeaderCell, styles.matrixColDriver]}>
                  Driver
                </Text>
              </View>

              {rows.map((row) => (
                <View key={row.governorate} style={styles.matrixRow} wrap={false}>
                  <Text style={styles.matrixColGovernorate}>
                    {GOVERNORATE_LABEL[row.governorate]}
                  </Text>
                  <View style={styles.matrixColRisk}>
                    <Text
                      style={[
                        styles.matrixBadge,
                        { backgroundColor: RISK_COLOR[row.risk] },
                      ]}
                    >
                      {THREAT_LABEL[row.risk]}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.matrixColTrend,
                      styles.matrixTrendText,
                      { color: TREND_COLOR[row.trend] },
                    ]}
                  >
                    {TREND_LABEL[row.trend]}
                  </Text>
                  <Text style={styles.matrixColDriver}>
                    {row.driver || "—"}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </Page>
      )}

      {/* ---- report body ---------------------------------------------------- */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.dateRow}>
          <Text style={styles.dateLabel}>Date: </Text>
          {dateLabel}
        </Text>

        {executiveSummary?.trim() && (
          <View>
            <Text style={styles.summaryHeading}>Executive Summary</Text>
            {/* One <Text> per paragraph, so blank lines in the console read as breaks here too. */}
            {executiveSummary
              .trim()
              .split(/\n\s*\n/)
              .map((paragraph, i) => (
                <Text key={i} style={styles.summaryBody}>
                  {paragraph.trim()}
                </Text>
              ))}
          </View>
        )}

        {kurdistanSummaries.length > 0 && (
          <View minPresenceAhead={60}>
            <Text style={styles.shortSummaryHeading}>
              Short Summaries of Major Events in Kurdistan
            </Text>
            {kurdistanSummaries.map(({ number, text }) => (
              <View key={number} style={styles.shortSummaryRow} wrap={false}>
                <Text style={styles.shortSummaryBullet}>•</Text>
                <Text style={styles.shortSummaryText}>{text}</Text>
              </View>
            ))}
          </View>
        )}

        {sections.map(({ category, events }) => (
          <View key={category ?? "general"} minPresenceAhead={60}>
            <Text
              style={[styles.categoryHeading, { backgroundColor: categoryColor(category) }]}
            >
              {category ? CATEGORY_HEADING[category] : UNCATEGORISED_HEADING}
            </Text>

            {events.map(({ item, number }) => {
              const place = locationLine(item);
              const kind = item.classification
                ? CLASSIFICATION_LABEL[item.classification]
                : null;
              return (
                <View key={number} style={styles.item} wrap={false}>
                  <View style={styles.itemTitleRow}>
                    <Text
                      style={[styles.itemNumber, { backgroundColor: categoryColor(item.category) }]}
                    >
                      {number}
                    </Text>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                  </View>
                  {(place || kind) && (
                    <Text style={styles.itemMeta}>
                      {[place, kind].filter(Boolean).join("  ·  ")}
                    </Text>
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
          </View>
        ))}

        <View style={styles.contactBlock} wrap={false}>
          <Text style={[styles.contactLine, styles.contactBold]}>
            Harekar For Private Security & Guarding
          </Text>
          <Text style={styles.contactLine}>Contact Information</Text>
          <Text style={styles.contactLine}>Dream City 100m road</Text>
          <Text style={styles.contactLine}>
            Erbil, Kurdistan Region of Iraq
          </Text>
          <Text style={styles.contactLine}>
            Phone Iraq +964 750 445 7862 - +964 750 4580092
          </Text>
          <Text style={[styles.contactLine, { color: gold }]}>
            Email: operationsmanager@harekargroup.com
          </Text>
        </View>
      </Page>

      {/* ---- daily event map ------------------------------------------------ */}
      {numbered.some(({ item }) => item.governorate || item.latitude != null) && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.mapTitle}>Daily Event Map</Text>
          <Text style={styles.mapSubtitle}>
            Events recorded on {dateLabel}. Numbers match the report above.
          </Text>
          <EventMap events={numbered} />
        </Page>
      )}
    </Document>
  );
}
