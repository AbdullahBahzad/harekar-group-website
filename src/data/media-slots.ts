/**
 * The site media an administrator can replace from the console's Media
 * station, and what each one falls back to when nothing has been uploaded.
 *
 * `fallback` is the file shipped in /public. "Restore original" in the
 * console simply removes the upload, which brings this back.
 *
 * Service photos and client logos are not here — each already has its own
 * station (Services, Clients), next to the copy it belongs with.
 */
export type MediaKind = "video" | "image";

export type MediaSlot = {
  kind: MediaKind;
  fallback: string;
  /** Upload ceiling, in bytes. */
  maxBytes: number;
};

const MB = 1024 * 1024;

export const mediaSlots = {
  /** The homepage banner video, as computers and tablets get it. */
  heroVideo: { kind: "video", fallback: "/video/harekar-hero-1080.mp4", maxBytes: 150 * MB },
  /**
   * The phone version of the same video. Optional: with no phone upload,
   * phones get the computer upload rather than the old shipped clip.
   */
  heroVideoMobile: { kind: "video", fallback: "/video/harekar-hero-720.mp4", maxBytes: 80 * MB },
  /** The still shown while the banner video loads, and instead of it under reduced motion. */
  heroPoster: { kind: "image", fallback: "/video/harekar-hero-poster.jpg", maxBytes: 10 * MB },
  /** The photo beside "Why choose Harekar". */
  whyPhoto: { kind: "image", fallback: "/photos/training-briefing.jpg", maxBytes: 10 * MB },
  /** The background of the Intelligence banner. */
  intelligencePhoto: { kind: "image", fallback: "/photos/map-briefing.jpg", maxBytes: 10 * MB },
} as const satisfies Record<string, MediaSlot>;

export type MediaSlotId = keyof typeof mediaSlots;

export const mediaSlotIds = Object.keys(mediaSlots) as MediaSlotId[];

export function isMediaSlotId(value: string): value is MediaSlotId {
  return Object.hasOwn(mediaSlots, value);
}

/**
 * Accepted upload types. Video is MP4 only: it is the one container every
 * browser plays, and the upload route additionally refuses MP4s whose video
 * is HEVC (see `lib/mp4-codec.ts`). SVG is never accepted as an image — it
 * can carry script.
 */
export const acceptedTypes: Record<MediaKind, readonly string[]> = {
  video: ["video/mp4"],
  image: ["image/jpeg", "image/png", "image/webp", "image/avif"],
};
