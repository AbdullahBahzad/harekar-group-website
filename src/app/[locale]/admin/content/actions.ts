"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

/**
 * Every English/Arabic/Kurdish text field on `SiteContent`, named by its
 * shared prefix (`"heroTitle"` covers `heroTitleEn`/`Ar`/`Ku`). Listed once
 * here rather than spelled out per field in `readSiteContent` and again in
 * the form component — both read this same list.
 */
export const TRIPLET_FIELDS = [
  "heroEyebrow",
  "heroTitle",
  "heroSubtitle",
  "aboutEyebrow",
  "aboutTitle",
  "aboutBody1",
  "aboutBody2",
  "aboutBody3",
  "missionTitle",
  "missionBody",
  "visionTitle",
  "visionBody",
  "statExperienceLabel",
  "statPersonnelLabel",
  "statSitesLabel",
  "statCoverageLabel",
  "footerTagline",
  "faqEyebrow",
  "faqTitle",
  "faqSubtitle",
  "faqCtaTitle",
  "faqCtaBody",
  "contactEyebrow",
  "contactTitle",
  "contactSubtitle",
  "careersEyebrow",
  "careersTitle",
  "proEyebrow",
  "proTitle",
  "proSubtitle",
  "planMonthlyName",
  "planMonthlyPeriod",
  "planMonthlyBlurb",
  "planYearlyName",
  "planYearlyPeriod",
  "planYearlyBlurb",
] as const;

/** The four stat figures — not per-locale, so one plain field each. */
export const VALUE_FIELDS = [
  "statExperienceValue",
  "statPersonnelValue",
  "statSitesValue",
  "statCoverageValue",
] as const;

function readSiteContent(formData: FormData): Record<string, string | null> {
  const data: Record<string, string | null> = {};

  for (const field of TRIPLET_FIELDS) {
    const en = String(formData.get(`${field}En`) ?? "").trim();
    if (!en) throw new Error(`English text is required for "${field}"`);
    data[`${field}En`] = en;

    const ar = String(formData.get(`${field}Ar`) ?? "").trim();
    const ku = String(formData.get(`${field}Ku`) ?? "").trim();
    data[`${field}Ar`] = ar || null;
    data[`${field}Ku`] = ku || null;
  }

  for (const field of VALUE_FIELDS) {
    const value = String(formData.get(field) ?? "").trim();
    if (!value) throw new Error(`A value is required for "${field}"`);
    data[field] = value;
  }

  return data;
}

/*
 * The public pages that read `SiteContent` — the home page (hero, about,
 * footer via the layout) plus every standalone page with its own intro.
 */
function revalidateSiteContent() {
  revalidatePath("/[locale]/admin/content", "page");
  revalidatePath("/[locale]/(site)", "layout");
  revalidatePath("/[locale]/(site)/faq", "page");
  revalidatePath("/[locale]/(site)/careers", "page");
  revalidatePath("/[locale]/(site)/contact", "page");
  revalidatePath("/[locale]/(site)/pro", "page");
  // The dashboard reports whether site content is console-controlled yet.
  revalidatePath("/[locale]/admin", "page");
}

/**
 * The whole page-copy form saves as one row. There is exactly one hero, one
 * mission, one footer tagline — a single upsert on the fixed `"site"` id
 * either creates the row on the first save or overwrites it wholesale on
 * every one after, which matches how the console's one editor screen edits
 * it: as one document, not a hundred independent fields.
 */
export async function saveSiteContent(formData: FormData) {
  await assertAdmin();
  const data = readSiteContent(formData);

  await prisma.siteContent.upsert({
    where: { id: "site" },
    create: { id: "site", ...data } as never,
    update: data as never,
  });

  revalidateSiteContent();
}
