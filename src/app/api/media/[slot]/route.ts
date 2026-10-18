import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mediaFilePath } from "@/lib/media";
import { isMediaSlotId, mediaSlots } from "@/data/media-slots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves an uploaded piece of site media.
 *
 * Byte ranges are supported because video depends on them: Safari will not
 * play a video at all from a server that ignores `Range`, and every browser
 * uses ranges to start playback before the whole file has arrived and to
 * seek. A range request is answered 206 with just those bytes, streamed from
 * disk — never the whole file read into memory.
 *
 * URLs carry `?v=<upload time>`, so responses can be cached for a year: a
 * new upload changes the URL rather than the bytes behind an old one.
 *
 * A slot with nothing uploaded (or whose file has gone missing from disk)
 * redirects to the media shipped with the site, so a stale link never 404s.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slot: string }> },
) {
  const { slot } = await params;
  if (!isMediaSlotId(slot)) return new NextResponse("Not found", { status: 404 });

  const fallback = () =>
    NextResponse.redirect(new URL(mediaSlots[slot].fallback, request.url), 307);

  let record: { mimeType: string } | null = null;
  try {
    record = await prisma.siteMedia.findUnique({
      where: { slot },
      select: { mimeType: true },
    });
  } catch {
    return fallback();
  }
  if (!record) return fallback();

  const filePath = mediaFilePath(slot);
  let size: number;
  try {
    size = (await stat(filePath)).size;
  } catch {
    return fallback();
  }

  const headers: Record<string, string> = {
    "Content-Type": record.mimeType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };

  const range = request.headers.get("range");
  const match = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (range && match) {
    let start: number;
    let end: number;
    if (match[1] === "") {
      // "bytes=-500": the last 500 bytes.
      const suffix = Number(match[2]);
      start = Math.max(0, size - suffix);
      end = size - 1;
    } else {
      start = Number(match[1]);
      end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
    }

    if (!Number.isFinite(start) || start > end || start >= size) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }

    const stream = Readable.toWeb(createReadStream(filePath, { start, end }));
    return new NextResponse(stream as ReadableStream, {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  const stream = Readable.toWeb(createReadStream(filePath));
  return new NextResponse(stream as ReadableStream, {
    headers: { ...headers, "Content-Length": String(size) },
  });
}
