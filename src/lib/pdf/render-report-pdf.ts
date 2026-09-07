import { readFile } from "node:fs/promises";
import path from "node:path";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import { ReportDocument, type ReportPdfItem } from "./report-document";
import type { ThreatLevel } from "@/lib/report-shape";

/*
 * `@react-pdf/renderer`'s default hyphenation engine dynamically loads a
 * locale dictionary in a way that only resolves inside a bundler (Next's
 * Turbopack/webpack rewrite the require; a plain Node `import` does not,
 * and throws `ERR_PACKAGE_PATH_NOT_EXPORTED`). This bulletin's text does not
 * need mid-word hyphenation, so the callback is replaced with a no-op —
 * "the word as given" — rather than pulling in the dictionary at all.
 */
Font.registerHyphenationCallback((word) => [word]);

/**
 * The cover assets, read once per render rather than embedded in the
 * component tree — `@react-pdf/renderer`'s `<Image>` wants raw bytes, and
 * reading a public asset from disk is the one thing a document component
 * (shared with nothing server-only in mind) should not do itself.
 */
const LOGO_PATH = path.join(process.cwd(), "public", "harekar-logo.png");
/*
 * A PNG copy of `public/services/cit.webp`, generated once with ffmpeg.
 * `@react-pdf/renderer`'s image decoder only understands JPEG and PNG, not
 * WebP, so the source asset is re-encoded rather than read directly.
 */
const COVER_PHOTO_PATH = path.join(process.cwd(), "public", "pdf-cover.png");

export type RenderReportPdfInput = {
  date: Date;
  kurdistanThreat: ThreatLevel;
  iraqThreat: ThreatLevel;
  politicalKurdistan: string | null;
  politicalIraq: string | null;
  weather: string | null;
  items: ReportPdfItem[];
};

/** `17 August 2026`, matching the template's own date format. */
function formatCoverDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function renderReportPdf(
  report: RenderReportPdfInput,
): Promise<Buffer> {
  const [logo, coverPhoto] = await Promise.all([
    readFile(LOGO_PATH),
    readFile(COVER_PHOTO_PATH),
  ]);

  return renderToBuffer(
    ReportDocument({
      dateLabel: formatCoverDate(report.date),
      kurdistanThreat: report.kurdistanThreat,
      iraqThreat: report.iraqThreat,
      politicalKurdistan: report.politicalKurdistan,
      politicalIraq: report.politicalIraq,
      weather: report.weather,
      items: report.items,
      logo,
      coverPhoto,
    }),
  );
}
