"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  draftReportItems,
  THREAT_LEVELS,
  REGIONS,
  type ThreatLevel,
  type Region,
  type ReportContent,
  type ReportNewsItem,
} from "@/lib/reports";

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
  revalidatePath("/[locale]/admin/reports", "page");
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

function readMeta(formData: FormData) {
  const dateValue = String(formData.get("date") ?? "");
  const date = dateValue ? new Date(dateValue) : new Date();
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

/** Persists a report the admin has reviewed and approved. */
export async function saveReport(formData: FormData) {
  const operatorId = await assertAdmin();
  const meta = readMeta(formData);

  const titles = formData.getAll("finalTitle").map(String);
  const bodies = formData.getAll("finalBody").map(String);
  const urls = formData.getAll("finalUrl").map(String);
  const regions = formData.getAll("finalRegion").map(String) as Region[];

  const items: ReportNewsItem[] = titles.map((title, i) => ({
    title,
    body: bodies[i] ?? "",
    url: urls[i] || null,
    region: regions[i],
  }));

  if (items.length === 0) throw new Error("Nothing to save");

  const content: ReportContent = { items };

  await prisma.dailyReport.create({
    data: { ...meta, content, createdById: operatorId },
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
