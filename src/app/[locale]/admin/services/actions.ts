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

/** Largest photo accepted, in bytes. */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/**
 * Image formats allowed on a service card.
 *
 * An allow-list, not a `startsWith("image/")` check: SVG is an image by MIME
 * type and also a document that can carry script, so serving an uploaded one
 * from this origin would be a stored XSS. It is deliberately absent.
 */
const ALLOWED_IMAGE_TYPES = new Set([
  "image/webp",
  "image/jpeg",
  "image/png",
  "image/avif",
]);

const GROUPS = new Set(["protection", "response", "logistics"]);

/**
 * Reads the uploaded photo, if one was supplied.
 *
 * Returns `null` when the field is empty, which is what lets "save without
 * touching the image" and "replace the image" share one form — an empty file
 * input must not blank an existing photo.
 */
async function readImage(formData: FormData) {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return null;

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(
      `Unsupported image type "${file.type}". Use WebP, JPEG, PNG or AVIF.`,
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image is larger than 4MB.");
  }

  return {
    imageData: Buffer.from(await file.arrayBuffer()),
    imageType: file.type,
    imageName: file.name,
  };
}

/** Slugs become URL segments and icon lookups, so they are normalised hard. */
function readSlug(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) throw new Error("A service needs a slug");
  return slug;
}

function readCopy(formData: FormData) {
  const titleEn = String(formData.get("titleEn") ?? "").trim();
  const descriptionEn = String(formData.get("descriptionEn") ?? "").trim();
  const group = String(formData.get("group") ?? "protection");

  if (!titleEn) throw new Error("An English title is required");
  if (!descriptionEn) throw new Error("An English description is required");
  if (!GROUPS.has(group)) throw new Error("Unknown group");

  const optional = (name: string) => {
    const value = String(formData.get(name) ?? "").trim();
    return value || null;
  };

  return {
    group,
    titleEn,
    descriptionEn,
    titleAr: optional("titleAr"),
    titleKu: optional("titleKu"),
    descriptionAr: optional("descriptionAr"),
    descriptionKu: optional("descriptionKu"),
    icon: optional("icon"),
    published: formData.get("published") === "on",
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
  };
}

/* Both the console and every public surface that lists services. */
function revalidateServices() {
  revalidatePath("/[locale]/admin/services", "page");
  revalidatePath("/[locale]/(site)/services", "page");
  revalidatePath("/[locale]/(site)", "page");
  // The dashboard counts live vs. hidden services.
  revalidatePath("/[locale]/admin", "page");
}

/**
 * Turns the unique-constraint violation on `slug` into a sentence.
 *
 * Slugs are normalised hard, so two services named similarly enough collide
 * easily — "K9 Units" and "K9 units" are the same slug. Left unhandled, Prisma's
 * P2002 escapes the action and Next replaces the console with an error overlay,
 * taking the half-filled form with it. `registerAccount` already catches the
 * same code for the same reason; this is that treatment, applied here.
 */
function asSlugCollision(error: unknown, slug: string): Error | null {
  const isDuplicate =
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002";

  return isDuplicate
    ? new Error(`A service with the slug "${slug}" already exists`)
    : null;
}

export async function createService(formData: FormData) {
  await assertAdmin();

  const slug = readSlug(String(formData.get("slug") ?? ""));
  const copy = readCopy(formData);
  const image = await readImage(formData);

  try {
    await prisma.service.create({
      data: { slug, ...copy, ...(image ?? {}) },
    });
  } catch (error) {
    throw asSlugCollision(error, slug) ?? error;
  }

  revalidateServices();
}

export async function updateService(formData: FormData) {
  await assertAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing service id");

  const slug = readSlug(String(formData.get("slug") ?? ""));
  const copy = readCopy(formData);
  const image = await readImage(formData);

  try {
    await prisma.service.update({
      where: { id },
      // Spreading only when an image was uploaded is what preserves the existing
      // photo on an ordinary save.
      data: { slug, ...copy, ...(image ?? {}) },
    });
  } catch (error) {
    // Renaming a service onto another's slug collides exactly as creating does.
    throw asSlugCollision(error, slug) ?? error;
  }

  revalidateServices();
}

export async function deleteService(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing service id");

  await prisma.service.delete({ where: { id } });
  revalidateServices();
}

export async function toggleServicePublished(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing service id");

  const service = await prisma.service.findUnique({
    where: { id },
    select: { published: true },
  });
  if (!service) throw new Error("Unknown service");

  await prisma.service.update({
    where: { id },
    data: { published: !service.published },
  });

  revalidateServices();
}

/** Removes the uploaded photo, falling the card back to the shipped image. */
export async function clearServiceImage(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing service id");

  await prisma.service.update({
    where: { id },
    data: { imageData: null, imageType: null, imageName: null },
  });

  revalidateServices();
}

/**
 * Copies the thirteen compiled-in services into the database.
 *
 * Imagery is not copied: the existing files stay on disk and are still served
 * by slug, so an imported service keeps its photo without duplicating four
 * megabytes of WebP into Postgres for no gain.
 */
export async function seedFromStaticServices() {
  await assertAdmin();

  const existing = await prisma.service.count();
  if (existing > 0) return;

  const { serviceGroups } = await import("@/data/services");
  const enMessages = (await import("@/messages/en.json")).default;
  const arMessages = (await import("@/messages/ar.json")).default;
  const kuMessages = (await import("@/messages/ckb.json")).default;

  type Item = { title: string; description: string };
  const read = (messages: unknown, key: string): Item | null => {
    const items = (messages as { services?: { items?: Record<string, Item> } })
      .services?.items;
    return items?.[key] ?? null;
  };

  let order = 0;
  const data = serviceGroups.flatMap((group) =>
    group.services.map((key) => {
      const en = read(enMessages, key);
      const ar = read(arMessages, key);
      const ku = read(kuMessages, key);

      return {
        slug: key,
        group: group.id,
        icon: key,
        titleEn: en?.title ?? key,
        descriptionEn: en?.description ?? "",
        titleAr: ar?.title ?? null,
        descriptionAr: ar?.description ?? null,
        titleKu: ku?.title ?? null,
        descriptionKu: ku?.description ?? null,
        published: true,
        sortOrder: order++,
      };
    }),
  );

  await prisma.service.createMany({ data });
  revalidateServices();
}
