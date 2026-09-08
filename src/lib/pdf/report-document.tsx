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
import type { ThreatLevel, Region } from "@/lib/report-shape";

/**
 * The Daily Security Report, laid out as the branded PDF that used to be
 * assembled by hand in a document editor — see `reports.ts` for how the
 * content itself gets drafted and reviewed before it ever reaches here.
 * This module only lays out already-approved text; it makes no editorial
 * decisions of its own.
 */

export type ReportPdfItem = {
  title: string;
  body: string;
  url: string | null;
  region: Region;
};

export type ReportPdfProps = {
  dateLabel: string;
  kurdistanThreat: ThreatLevel;
  iraqThreat: ThreatLevel;
  politicalKurdistan: string | null;
  politicalIraq: string | null;
  weather: string | null;
  items: ReportPdfItem[];
  /** Raw image bytes, read from disk by the caller — see `render-report-pdf.ts`. */
  logo: Buffer;
  coverPhoto: Buffer;
};

const REGION_HEADING: Record<Region, string> = {
  KURDISTAN: "Kurdistan Region of Iraq",
  IRAQ: "Iraq",
};

const THREAT_LABEL: Record<ThreatLevel, string> = {
  LOW: "LOW",
  MODERATE: "MODERATE",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
};

const gold = "#a88a4a";
const ink = "#1a1712";

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
  itemTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  itemBody: { fontSize: 9, lineHeight: 1.4, marginBottom: 3 },
  itemUrl: { fontSize: 8, color: gold },

  contactBlock: { marginTop: 20 },
  contactLine: { fontSize: 9, marginBottom: 2 },
  contactBold: { fontFamily: "Helvetica-Bold" },
});

export function ReportDocument({
  dateLabel,
  kurdistanThreat,
  iraqThreat,
  politicalKurdistan,
  politicalIraq,
  weather,
  items,
  logo,
  coverPhoto,
}: ReportPdfProps) {
  // Kurdistan first, then Iraq-wide — matching the template's own ordering.
  // A region with no items that day is skipped rather than printed empty.
  const regions: Region[] = ["KURDISTAN", "IRAQ"];
  const byRegion = regions
    .map((region) => ({
      region,
      items: items.filter((item) => item.region === region),
    }))
    .filter((group) => group.items.length > 0);

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

      {/* ---- report body ---------------------------------------------------- */}
      <Page size="A4" style={styles.page}>
        {byRegion.map((group) => (
          <View key={group.region} wrap={false} minPresenceAhead={40}>
            <Text style={styles.regionHeading}>
              {REGION_HEADING[group.region]}
            </Text>
            <Text style={styles.dateRow}>
              <Text style={styles.dateLabel}>Date: </Text>
              {dateLabel}
            </Text>

            {group.items.map((item, i) => (
              <View key={i} style={styles.item} wrap={false}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemBody}>{item.body}</Text>
                {item.url && (
                  <Link src={item.url} style={styles.itemUrl}>
                    {item.url}
                  </Link>
                )}
              </View>
            ))}
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
    </Document>
  );
}
