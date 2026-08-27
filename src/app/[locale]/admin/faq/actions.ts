"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
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

/** Splits the bullet-list textarea into one string per non-empty line. */
function readList(value: string): string[] | null {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : null;
}

function readCopy(formData: FormData) {
  const questionEn = String(formData.get("questionEn") ?? "").trim();
  const answerEn = String(formData.get("answerEn") ?? "").trim();
  if (!questionEn) throw new Error("An English question is required");
  if (!answerEn) throw new Error("An English answer is required");

  const optional = (name: string) => {
    const value = String(formData.get(name) ?? "").trim();
    return value || null;
  };
  const list = (name: string) => readList(String(formData.get(name) ?? ""));

  return {
    questionEn,
    answerEn,
    questionAr: optional("questionAr"),
    questionKu: optional("questionKu"),
    answerAr: optional("answerAr"),
    answerKu: optional("answerKu"),
    listEn: list("listEn") ?? undefined,
    listAr: list("listAr") ?? undefined,
    listKu: list("listKu") ?? undefined,
    published: formData.get("published") === "on",
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
  };
}

function revalidateFaq() {
  revalidatePath("/[locale]/admin/faq", "page");
  revalidatePath("/[locale]/(site)/faq", "page");
}

export async function createFaqItem(formData: FormData) {
  await assertAdmin();
  const copy = readCopy(formData);
  await prisma.faqItem.create({ data: copy });
  revalidateFaq();
}

export async function updateFaqItem(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing FAQ item id");

  const copy = readCopy(formData);
  await prisma.faqItem.update({
    where: { id },
    // `listEn/Ar/Ku` are cleared explicitly rather than left untouched when
    // the textarea is emptied — otherwise a bullet list, once added, could
    // never be removed through the form.
    data: {
      ...copy,
      listEn: copy.listEn ?? Prisma.JsonNull,
      listAr: copy.listAr ?? Prisma.JsonNull,
      listKu: copy.listKu ?? Prisma.JsonNull,
    },
  });
  revalidateFaq();
}

export async function deleteFaqItem(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing FAQ item id");

  await prisma.faqItem.delete({ where: { id } });
  revalidateFaq();
}

export async function toggleFaqPublished(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing FAQ item id");

  const item = await prisma.faqItem.findUnique({
    where: { id },
    select: { published: true },
  });
  if (!item) throw new Error("Unknown FAQ item");

  await prisma.faqItem.update({
    where: { id },
    data: { published: !item.published },
  });
  revalidateFaq();
}

/** Copies the six shipped questions into the database, once. */
export async function seedFromStaticFaq() {
  await assertAdmin();

  const existing = await prisma.faqItem.count();
  if (existing > 0) return;

  const enMessages = (await import("@/messages/en.json")).default;
  const arMessages = (await import("@/messages/ar.json")).default;
  const kuMessages = (await import("@/messages/ckb.json")).default;

  const ids = [
    "types",
    "hours",
    "response",
    "licensed",
    "vetting",
    "specialized",
  ] as const;

  type Item = { q: string; a: string; list?: string[] };
  const read = (messages: unknown, id: string): Item | null =>
    (messages as { faq?: { items?: Record<string, Item> } }).faq?.items?.[
      id
    ] ?? null;

  const data = ids.map((id, i) => {
    const en = read(enMessages, id);
    const ar = read(arMessages, id);
    const ku = read(kuMessages, id);

    return {
      questionEn: en?.q ?? id,
      answerEn: en?.a ?? "",
      questionAr: ar?.q ?? null,
      answerAr: ar?.a ?? null,
      questionKu: ku?.q ?? null,
      answerKu: ku?.a ?? null,
      listEn: en?.list,
      listAr: ar?.list,
      listKu: ku?.list,
      published: true,
      sortOrder: i,
    };
  });

  await prisma.faqItem.createMany({ data });
  revalidateFaq();
}
