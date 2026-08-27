"use server";

import { revalidatePath } from "next/cache";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { clientCategories } from "@/lib/client-logos";

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

/** Largest logo accepted, in bytes. Marks, not photos — small ceiling. */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/webp",
  "image/png",
  "image/jpeg",
  "image/avif",
]);

/**
 * Reads the uploaded logo, if one was supplied. Returns `null` when the
 * field is empty, which is what lets "save without touching the image" and
 * "replace the image" share one form — an empty file input must not blank an
 * existing logo.
 */
async function readImage(formData: FormData) {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return null;

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(
      `Unsupported image type "${file.type}". Use WebP, PNG, JPEG or AVIF.`,
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image is larger than 2MB.");
  }

  return {
    imageData: Buffer.from(await file.arrayBuffer()),
    imageType: file.type,
    imageName: file.name,
  };
}

function readCopy(formData: FormData) {
  const category = String(formData.get("category") ?? "");
  if (!clientCategories.includes(category as never)) {
    throw new Error("Unknown category");
  }

  const name = String(formData.get("name") ?? "").trim();

  // Clamped so a mistyped value cannot push the logo off its cell.
  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));
  const num = (field: string, fallback: number) => {
    const raw = Number(formData.get(field));
    return Number.isFinite(raw) ? raw : fallback;
  };

  return {
    category,
    name: name || null,
    w: clamp(num("w", 60), 5, 100),
    cx: clamp(num("cx", 50), 0, 100),
    cy: clamp(num("cy", 50), 0, 100),
    published: formData.get("published") === "on",
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
  };
}

function revalidateClients() {
  revalidatePath("/[locale]/admin/clients", "page");
  revalidatePath("/[locale]/(site)/clients", "page");
}

export async function createClient(formData: FormData) {
  await assertAdmin();
  const copy = readCopy(formData);
  const image = await readImage(formData);

  await prisma.client.create({ data: { ...copy, ...(image ?? {}) } });
  revalidateClients();
}

export async function updateClient(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing client id");

  const copy = readCopy(formData);
  const image = await readImage(formData);

  await prisma.client.update({
    where: { id },
    // Spreading only when an image was uploaded is what preserves the
    // existing logo on an ordinary save.
    data: { ...copy, ...(image ?? {}) },
  });
  revalidateClients();
}

export async function deleteClient(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing client id");

  await prisma.client.delete({ where: { id } });
  revalidateClients();
}

export async function toggleClientPublished(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing client id");

  const client = await prisma.client.findUnique({
    where: { id },
    select: { published: true },
  });
  if (!client) throw new Error("Unknown client");

  await prisma.client.update({
    where: { id },
    data: { published: !client.published },
  });
  revalidateClients();
}

/**
 * Copies the 37 shipped logos into the database, bytes and all — unlike
 * `seedFromStaticServices`, which leaves imagery on disk, these files are
 * small marks (tens of KB each) with no wider reuse, so migrating the actual
 * bytes is what lets a seeded logo be edited or replaced through the console
 * like any other. Runs once; a no-op once any client row exists.
 */
export async function seedFromStaticClients() {
  await assertAdmin();

  const existing = await prisma.client.count();
  if (existing > 0) return;

  const { clientLogos } = await import("@/lib/client-logos");

  const data = await Promise.all(
    clientLogos.map(async (logo, i) => {
      const filePath = path.join(
        process.cwd(),
        "public",
        "clients",
        `logo-${logo.n}.png`,
      );
      const bytes = await readFile(filePath);

      return {
        name: logo.name ?? null,
        category: logo.category,
        imageData: bytes,
        imageType: "image/png",
        imageName: `logo-${logo.n}.png`,
        w: logo.w,
        cx: logo.cx,
        cy: logo.cy,
        published: true,
        sortOrder: i,
      };
    }),
  );

  await prisma.client.createMany({ data });
  revalidateClients();
}
