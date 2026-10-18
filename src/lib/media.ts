import path from "node:path";
import { logReadFallback, prisma } from "@/lib/prisma";
import { mediaSlotIds, mediaSlots, type MediaSlotId } from "@/data/media-slots";

/**
 * Where uploaded media is kept on disk.
 *
 * Outside /public on purpose: Next serves only the files that were in /public
 * when the site was built, so an upload placed there would not appear until
 * the next build. Uploads are served by `/api/media/[slot]` instead.
 *
 * The default sits inside the project (`uploads/media`, ignored by git, so a
 * `git pull` never touches it). Set MEDIA_DIR to keep uploads elsewhere.
 */
export const MEDIA_DIR =
  process.env.MEDIA_DIR || path.join(process.cwd(), "uploads", "media");

/** The one file a slot's upload lives in — replaced whole on each upload. */
export function mediaFilePath(slot: MediaSlotId) {
  return path.join(MEDIA_DIR, slot);
}

export type MediaUrls = Record<MediaSlotId, string>;

/**
 * The URL each slot should be shown from: its upload where there is one —
 * versioned by upload time, so replacing a file busts the year-long cache on
 * the media route — and the shipped file otherwise.
 *
 * The phone video follows the computer one: if only the computer version has
 * been replaced, phones get that upload rather than the old shipped clip, so
 * the two never show different films.
 */
export async function getMediaUrls(): Promise<MediaUrls> {
  let rows: { slot: string; updatedAt: Date }[] = [];
  try {
    rows = await prisma.siteMedia.findMany({ select: { slot: true, updatedAt: true } });
  } catch (error) {
    logReadFallback("shipped site media", error);
  }

  const uploaded = new Map(rows.map((row) => [row.slot, row.updatedAt.getTime()]));
  const urlFor = (slot: MediaSlotId) => {
    const version = uploaded.get(slot);
    return version ? `/api/media/${slot}?v=${version}` : mediaSlots[slot].fallback;
  };

  const urls = Object.fromEntries(mediaSlotIds.map((slot) => [slot, urlFor(slot)])) as MediaUrls;
  if (uploaded.has("heroVideo") && !uploaded.has("heroVideoMobile")) {
    urls.heroVideoMobile = urls.heroVideo;
  }
  return urls;
}
