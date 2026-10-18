import { randomBytes } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, open, rename, rm } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MEDIA_DIR, mediaFilePath } from "@/lib/media";
import { H264_CODECS, HEVC_CODECS, mp4Codecs } from "@/lib/mp4-codec";
import { acceptedTypes, isMediaSlotId, mediaSlots, type MediaSlotId } from "@/data/media-slots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Upload (POST) and restore-original (DELETE) for the Media station.
 *
 * A route handler rather than a server action because the files are large: a
 * server action buffers its whole body against a small size cap, while this
 * streams the request straight to disk and stops counting the moment it
 * passes the slot's limit. The browser sends the raw file as the body
 * (Content-Type = the file's type, X-File-Name = its name), so progress can
 * be reported as it uploads.
 *
 * Errors come back as `{ error: "<key>" }`, a key under `admin.media.errors`.
 */

type Fail = { status: number; error: string };
const fail = ({ status, error }: Fail) => NextResponse.json({ error }, { status });

/** Signed-in, and an administrator by the database's account — not the session's. */
async function isAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  return Boolean(user?.isAdmin);
}

/**
 * Same-origin only. The session cookie is SameSite=Lax, which already keeps
 * it off cross-site POSTs; this is the second lock, in case it ever is not.
 */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin fetches from some browsers omit it
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** What an image file's first bytes must be, so a mislabelled file is refused. */
function imageSignatureMatches(head: Buffer, type: string): boolean {
  switch (type) {
    case "image/jpeg":
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case "image/png":
      return head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/webp":
      return head.toString("latin1", 0, 4) === "RIFF" && head.toString("latin1", 8, 12) === "WEBP";
    case "image/avif":
      return head.toString("latin1", 4, 8) === "ftyp" && /^avi[fs]$/.test(head.toString("latin1", 8, 12));
    default:
      return false;
  }
}

async function readHead(filePath: string): Promise<Buffer> {
  const file = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(16);
    await file.read(buffer, 0, 16, 0);
    return buffer;
  } finally {
    await file.close();
  }
}

/** Checks the uploaded file's real content against what the slot accepts. */
async function verifyContent(slot: MediaSlotId, filePath: string, type: string): Promise<Fail | null> {
  if (mediaSlots[slot].kind === "image") {
    return imageSignatureMatches(await readHead(filePath), type)
      ? null
      : { status: 415, error: "wrongType" };
  }

  const codecs = await mp4Codecs(filePath);
  if (!codecs) return { status: 415, error: "invalidVideo" };
  if (codecs.some((codec) => HEVC_CODECS.has(codec))) return { status: 415, error: "hevc" };
  if (!codecs.some((codec) => H264_CODECS.has(codec))) return { status: 415, error: "notH264" };
  return null;
}

async function guard(request: Request, slot: string): Promise<Fail | MediaSlotId> {
  if (!isMediaSlotId(slot)) return { status: 404, error: "generic" };
  if (!sameOrigin(request)) return { status: 403, error: "generic" };
  if (!(await isAdmin())) return { status: 404, error: "generic" };
  return slot;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slot: string }> },
) {
  const checked = await guard(request, (await params).slot);
  if (typeof checked !== "string") return fail(checked);
  const slot = checked;
  const { kind, maxBytes } = mediaSlots[slot];

  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!acceptedTypes[kind].includes(type)) return fail({ status: 415, error: "wrongType" });

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) return fail({ status: 413, error: "tooLarge" });
  if (!request.body) return fail({ status: 400, error: "generic" });

  const rawName = request.headers.get("x-file-name") ?? "";
  let fileName: string = slot;
  try {
    fileName = decodeURIComponent(rawName).replace(/[\\/\0-\x1f]/g, "").slice(0, 200) || slot;
  } catch {
    // A malformed name is cosmetic — keep the slot as the label.
  }

  await mkdir(MEDIA_DIR, { recursive: true });
  const temp = path.join(MEDIA_DIR, `.upload-${slot}-${randomBytes(6).toString("hex")}`);

  let received = 0;
  const limit = new Transform({
    transform(chunk: Buffer, _encoding, done) {
      received += chunk.length;
      if (received > maxBytes) done(new Error("tooLarge"));
      else done(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(request.body as import("node:stream/web").ReadableStream),
      limit,
      createWriteStream(temp),
    );
  } catch (error) {
    await rm(temp, { force: true });
    if (error instanceof Error && error.message === "tooLarge") {
      return fail({ status: 413, error: "tooLarge" });
    }
    console.error("Media upload was interrupted", error);
    return fail({ status: 400, error: "generic" });
  }

  if (received === 0) {
    await rm(temp, { force: true });
    return fail({ status: 400, error: "generic" });
  }

  const problem = await verifyContent(slot, temp, type).catch(() => ({ status: 415, error: "invalidVideo" }));
  if (problem) {
    await rm(temp, { force: true });
    return fail(problem);
  }

  // Swap the new file in whole, so a visitor mid-download never gets half of it.
  await rename(temp, mediaFilePath(slot));
  const record = await prisma.siteMedia.upsert({
    where: { slot },
    update: { fileName, mimeType: type, size: received },
    create: { slot, fileName, mimeType: type, size: received },
  });

  revalidatePath("/", "layout");
  return NextResponse.json({
    ok: true,
    url: `/api/media/${slot}?v=${record.updatedAt.getTime()}`,
    fileName: record.fileName,
    size: record.size,
    updatedAt: record.updatedAt.toISOString(),
  });
}

/** Restore the original: forget the upload, and the shipped file shows again. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slot: string }> },
) {
  const checked = await guard(request, (await params).slot);
  if (typeof checked !== "string") return fail(checked);
  const slot = checked;

  await prisma.siteMedia.deleteMany({ where: { slot } });
  await rm(mediaFilePath(slot), { force: true });

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, url: mediaSlots[slot].fallback });
}
