import { open, type FileHandle } from "node:fs/promises";

/**
 * Reads which codecs an MP4 file's tracks use, by walking its box structure
 * down to each track's sample description (moov › trak › mdia › minf › stbl ›
 * stsd) and reading the sample-entry type — `avc1` for H.264, `hvc1`/`hev1`
 * for HEVC, `mp4a` for AAC audio.
 *
 * Why it matters: an iPhone records HEVC by default, saved as an ordinary
 * `.mp4`/`.mov` with an ordinary `video/mp4` type, and Chrome, Edge and
 * Firefox on most machines cannot decode it — the homepage banner would stay
 * on its poster with no error anywhere. The file's type and name cannot tell
 * the two apart; only the sample entry can.
 *
 * Only box headers are read, never the media itself, so this is a few dozen
 * small reads however large the file is. Returns null if the file is not a
 * readable MP4 (no `moov` box).
 */
const CONTAINERS = new Set(["moov", "trak", "mdia", "minf", "stbl"]);

async function readAt(file: FileHandle, position: number, length: number) {
  const buffer = Buffer.alloc(length);
  const { bytesRead } = await file.read(buffer, 0, length, position);
  return buffer.subarray(0, bytesRead);
}

export async function mp4Codecs(path: string): Promise<string[] | null> {
  const file = await open(path, "r");
  try {
    const { size: fileSize } = await file.stat();
    const codecs: string[] = [];
    let sawMoov = false;
    let budget = 10_000; // boxes visited; a malformed file cannot loop forever

    async function walk(start: number, end: number): Promise<void> {
      let position = start;
      while (position + 8 <= end && budget-- > 0) {
        const header = await readAt(file, position, 16);
        if (header.length < 8) return;

        let boxSize = header.readUInt32BE(0);
        const type = header.toString("latin1", 4, 8);
        let headerSize = 8;
        if (boxSize === 1) {
          if (header.length < 16) return;
          boxSize = Number(header.readBigUInt64BE(8));
          headerSize = 16;
        } else if (boxSize === 0) {
          boxSize = end - position; // runs to the end of its parent
        }
        if (boxSize < headerSize || position + boxSize > end) return;

        if (type === "moov") sawMoov = true;

        if (CONTAINERS.has(type)) {
          await walk(position + headerSize, position + boxSize);
        } else if (type === "stsd") {
          // version/flags (4) + entry count (4), then the first entry's
          // size (4) and type (4) — the codec.
          const entry = await readAt(file, position + headerSize + 8, 8);
          if (entry.length === 8) codecs.push(entry.toString("latin1", 4, 8));
        }

        position += boxSize;
      }
    }

    await walk(0, fileSize);
    return sawMoov ? codecs : null;
  } finally {
    await file.close();
  }
}

/** Sample-entry types for H.264 — the one video codec every browser plays. */
export const H264_CODECS = new Set(["avc1", "avc3"]);
/** Sample-entry types for HEVC, including Dolby Vision on HEVC. */
export const HEVC_CODECS = new Set(["hvc1", "hev1", "dvh1", "dvhe"]);
