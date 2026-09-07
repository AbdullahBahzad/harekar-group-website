"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  draftReportItems,
  fetchArticleText,
  THREAT_LEVELS,
  REGIONS,
  type ThreatLevel,
  type Region,
  type ReportContent,
  type ReportNewsItem,
} from "@/lib/reports";
import { fetchHeadlines, type Headline } from "@/lib/headlines";
import { REPORT_SOURCES } from "@/data/report-sources";

/**
 * Every mutation re-checks admin rights.
 *
 * A server action is a public HTTP endpoint. Guarding only the page that
 * renders the form leaves the action itself callable by anyone who can read
 * its id out of the page source — the check has to live on the action.
 */
async function assertAdmin(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) throw new Error("Not authorised");

  return session.user.id;
}

function revalidateReports() {
  revalidatePath("/[locale]/admin/sources", "page");
  // The dashboard carries the report count and the activity feed, both of
  // which a save or delete here changes.
  revalidatePath("/[locale]/admin", "page");
  // Reports are published to subscribers on the intelligence route, so an
  // approval has to reach the page that serves them.
  revalidatePath("/[locale]/(site)/intelligence", "page");
}

/**
 * Fetches the curated sources and asks Claude to write them up.
 *
 * Nothing is persisted here — the draft returns to the browser for the
 * analyst to review, edit, and only then save with `saveReport`.
 */
export async function generateReportDraft(
  formData: FormData,
): Promise<ReportNewsItem[]> {
  await assertAdmin();

  const urls = formData.getAll("itemUrl").map(String);
  const notes = formData.getAll("itemNotes").map(String);
  const regions = formData.getAll("itemRegion").map(String) as Region[];

  const raw = urls
    .map((url, i) => ({
      url: url.trim(),
      notes: notes[i] ?? "",
      region: regions[i],
    }))
    .filter((item) => item.url || item.notes.trim());

  if (raw.length === 0) throw new Error("Add at least one news item");
  if (raw.some((item) => !REGIONS.includes(item.region))) {
    throw new Error("Unknown region on a news item");
  }

  return draftReportItems(raw);
}

export type SourceHeadlines = {
  name: string;
  defaultRegion: Region;
  headlines: Headline[];
  /** The fetch itself failed (site unreachable, blocked, timed out, ...). */
  failed: boolean;
};

/**
 * Today's candidate headlines from every fixed source, for the "fetch
 * today's headlines" checklist.
 *
 * Sources are checked in parallel and independently of one another —
 * `Promise.allSettled`, not `Promise.all` — because one outlet being down or
 * redesigned should not blank the other ten; it just comes back `failed` and
 * the analyst tries again later or skips it for today.
 */
export async function fetchAllSourceHeadlines(): Promise<SourceHeadlines[]> {
  await assertAdmin();

  const results = await Promise.allSettled(
    REPORT_SOURCES.map((source) => fetchHeadlines(source.url)),
  );

  return REPORT_SOURCES.map((source, i) => {
    const result = results[i];
    const headlines = result.status === "fulfilled" ? result.value : [];
    return {
      name: source.name,
      defaultRegion: source.defaultRegion,
      headlines,
      failed: result.status === "rejected" || headlines.length === 0,
    };
  });
}

/** One headline the analyst checked in the "fetch today's headlines" list. */
type HeadlineSelection = { title: string; url: string; region: Region };

/**
 * Turns checked headlines straight into report-ready items, with no
 * `ANTHROPIC_API_KEY` involved at all.
 *
 * `generateReportDraft` above is the polished path: Claude reads the source
 * and writes a bulletin-register paragraph. This is the plain one — the
 * article's own text, lightly cleaned and trimmed to a paragraph — for a
 * deployment with no key configured, or an operator who would rather not pay
 * per generation. Either way the result lands in the same review panel and
 * is edited and approved the same way before `saveReport` ever sees it.
 */
export async function pullHeadlineItems(
  selections: HeadlineSelection[],
): Promise<ReportNewsItem[]> {
  await assertAdmin();

  if (selections.length === 0) throw new Error("Nothing selected");
  if (selections.some((s) => !REGIONS.includes(s.region))) {
    throw new Error("Unknown region on a selected headline");
  }

  return Promise.all(
    selections.map(async (selection) => {
      const text = await fetchArticleText(selection.url);
      return {
        title: selection.title,
        body: text
          ? toParagraph(text)
          : "(Could not retrieve the article text — write a summary here.)",
        url: selection.url,
        region: selection.region,
      };
    }),
  );
}

/**
 * Cuts fetched article text down to one bulletin-length paragraph.
 *
 * Breaks at the last sentence boundary before the limit rather than a hard
 * cut, so the item reads as a complete paragraph instead of trailing off
 * mid-sentence — the same reason a hard cut is only the fallback when no
 * sentence break exists in range at all (a wire story with no punctuation
 * that early, or written in a script this regex does not recognise).
 */
function toParagraph(text: string, maxLen = 900): string {
  if (text.length <= maxLen) return text;

  const slice = text.slice(0, maxLen);
  const lastBreak = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
  );

  return lastBreak > maxLen * 0.4
    ? slice.slice(0, lastBreak + 1)
    : slice.trimEnd() + "…";
}

/**
 * The day a report covers, with the time of day discarded.
 *
 * `<input type="date">` already yields UTC midnight, but an omitted field falls
 * back to `new Date()` and would carry the hour it happened to be saved. Two
 * saves of the same day would then differ by minutes and read as two different
 * days — which is precisely what the unique constraint on `date` cannot see.
 * Normalising here is what makes "one report per day" a fact the database can
 * enforce rather than a convention.
 */
function startOfUtcDay(value: Date): Date {
  const day = new Date(value);
  day.setUTCHours(0, 0, 0, 0);
  return day;
}

function readMeta(formData: FormData) {
  const dateValue = String(formData.get("date") ?? "");
  const date = startOfUtcDay(dateValue ? new Date(dateValue) : new Date());
  const kurdistanThreat = String(
    formData.get("kurdistanThreat") ?? "MODERATE",
  ) as ThreatLevel;
  const iraqThreat = String(formData.get("iraqThreat") ?? "HIGH") as ThreatLevel;
  const politicalKurdistan = String(
    formData.get("politicalKurdistan") ?? "",
  ).trim();
  const politicalIraq = String(formData.get("politicalIraq") ?? "").trim();
  const weather = String(formData.get("weather") ?? "").trim();

  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  if (!THREAT_LEVELS.includes(kurdistanThreat)) {
    throw new Error("Unknown Kurdistan threat level");
  }
  if (!THREAT_LEVELS.includes(iraqThreat)) {
    throw new Error("Unknown Iraq threat level");
  }

  return {
    date,
    kurdistanThreat,
    iraqThreat,
    politicalKurdistan: politicalKurdistan || null,
    politicalIraq: politicalIraq || null,
    weather: weather || null,
  };
}

/**
 * A source link, or nothing at all.
 *
 * Held in the report's JSON as the item's provenance, so the only two useful
 * forms are an ordinary web address and an honest absence. `javascript:` is
 * neither, and the day this stops being plain text and becomes an anchor is the
 * day that would matter — cheaper to refuse it on the way in than to remember
 * on the way out.
 */
function readSourceUrl(value: string | undefined, index: number): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Item ${index + 1}: "${raw}" is not a valid URL`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Item ${index + 1}: a source must be an http or https URL`);
  }

  return parsed.toString();
}

/** Persists a report the admin has reviewed and approved. */
export async function saveReport(formData: FormData) {
  const operatorId = await assertAdmin();
  const meta = readMeta(formData);

  const titles = formData.getAll("finalTitle").map(String);
  const bodies = formData.getAll("finalBody").map(String);
  const urls = formData.getAll("finalUrl").map(String);
  const regions = formData.getAll("finalRegion").map(String);

  if (titles.length === 0) throw new Error("Nothing to save");

  /*
   * `content` is a `Json` column, so the database will accept any shape at all
   * and whatever lands here is exactly what the bulletin renders later.
   * `generateReportDraft` already checks regions on the way *out* to Claude;
   * this is the path that actually persists, so it cannot be the looser of the
   * two — which it was, casting straight to `Region[]` and asking nothing.
   */
  const items: ReportNewsItem[] = titles.map((rawTitle, i) => {
    const title = rawTitle.trim();
    const body = (bodies[i] ?? "").trim();
    const region = regions[i];

    if (!title || !body) {
      throw new Error(`Item ${i + 1} needs both a title and a body`);
    }
    if (!REGIONS.includes(region as Region)) {
      throw new Error(
        `Item ${i + 1} has an unknown region "${region ?? ""}"`,
      );
    }

    return {
      title,
      body,
      url: readSourceUrl(urls[i], i),
      region: region as Region,
    };
  });

  const content: ReportContent = { items };

  /*
   * Upsert, not create. Saving a day that already has a report is an analyst
   * revising it — the alternative was two rows for one date and no rule for
   * which one operations should read.
   *
   * Authorship is set only on create: a corrected report is still the one that
   * analyst filed, and `updatedAt` already records that it was touched again.
   */
  await prisma.dailyReport.upsert({
    where: { date: meta.date },
    create: { ...meta, content, createdById: operatorId },
    update: { ...meta, content },
  });

  revalidateReports();
}

export async function deleteReport(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing report id");

  await prisma.dailyReport.delete({ where: { id } });
  revalidateReports();
}
