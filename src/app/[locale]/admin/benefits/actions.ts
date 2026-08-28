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

function readCopy(formData: FormData) {
  const titleEn = String(formData.get("titleEn") ?? "").trim();
  const bodyEn = String(formData.get("bodyEn") ?? "").trim();
  if (!titleEn) throw new Error("An English title is required");
  if (!bodyEn) throw new Error("An English body is required");

  const optional = (name: string) => {
    const value = String(formData.get(name) ?? "").trim();
    return value || null;
  };

  return {
    titleEn,
    bodyEn,
    titleAr: optional("titleAr"),
    titleKu: optional("titleKu"),
    bodyAr: optional("bodyAr"),
    bodyKu: optional("bodyKu"),
    published: formData.get("published") === "on",
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
  };
}

function revalidateBenefits() {
  revalidatePath("/[locale]/admin/benefits", "page");
  revalidatePath("/[locale]/(site)/careers", "page");
  // The dashboard counts live vs. hidden cards.
  revalidatePath("/[locale]/admin", "page");
}

export async function createBenefit(formData: FormData) {
  await assertAdmin();
  await prisma.careerBenefit.create({ data: readCopy(formData) });
  revalidateBenefits();
}

export async function updateBenefit(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing benefit id");

  await prisma.careerBenefit.update({ where: { id }, data: readCopy(formData) });
  revalidateBenefits();
}

export async function deleteBenefit(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing benefit id");

  await prisma.careerBenefit.delete({ where: { id } });
  revalidateBenefits();
}

export async function toggleBenefitPublished(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing benefit id");

  const benefit = await prisma.careerBenefit.findUnique({
    where: { id },
    select: { published: true },
  });
  if (!benefit) throw new Error("Unknown benefit");

  await prisma.careerBenefit.update({
    where: { id },
    data: { published: !benefit.published },
  });
  revalidateBenefits();
}

/** Copies the five shipped "why work here" cards into the database, once. */
export async function seedFromStaticBenefits() {
  await assertAdmin();

  const existing = await prisma.careerBenefit.count();
  if (existing > 0) return;

  const enMessages = (await import("@/messages/en.json")).default;
  const arMessages = (await import("@/messages/ar.json")).default;
  const kuMessages = (await import("@/messages/ckb.json")).default;

  const ids = [
    "environment",
    "development",
    "collaboration",
    "projects",
    "excellence",
  ] as const;

  type Item = { title: string; body: string };
  const read = (messages: unknown, id: string): Item | null =>
    (messages as { careers?: { benefits?: Record<string, Item> } }).careers
      ?.benefits?.[id] ?? null;

  const data = ids.map((id, i) => {
    const en = read(enMessages, id);
    const ar = read(arMessages, id);
    const ku = read(kuMessages, id);

    return {
      titleEn: en?.title ?? id,
      bodyEn: en?.body ?? "",
      titleAr: ar?.title ?? null,
      bodyAr: ar?.body ?? null,
      titleKu: ku?.title ?? null,
      bodyKu: ku?.body ?? null,
      published: true,
      sortOrder: i,
    };
  });

  await prisma.careerBenefit.createMany({ data });
  revalidateBenefits();
}
