/** Frame is scaled into this square to check whether any pixel is see-through. */
const SAMPLE = 32;

/**
 * Did this browser actually paint an alpha-channel video's transparency?
 *
 * There is no honest way to ask up front. `canPlayType` reports on the
 * container and codec, not on the alpha channel, and some browsers answer
 * "probably" for alpha WebM while still throwing the alpha away — so a
 * capability check reads as support right up until the clip arrives opaque.
 *
 * So the question is put to the renderer instead: draw the frame that is
 * already decoded and look at it. The clip's corners are meant to be
 * background, so a browser honouring the alpha channel produces see-through
 * pixels there and one discarding it produces opaque ones. Returns null when
 * the frame cannot be read at all, which callers should treat the same as no
 * support.
 */
export function paintedWithAlpha(video: HTMLVideoElement): boolean | null {
  if (!video.videoWidth || !video.videoHeight) return null;

  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE;
  canvas.height = SAMPLE;

  const context = canvas.getContext("2d");
  if (!context) return null;

  try {
    context.clearRect(0, 0, SAMPLE, SAMPLE);
    context.drawImage(video, 0, 0, SAMPLE, SAMPLE);

    const { data } = context.getImageData(0, 0, SAMPLE, SAMPLE);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 255) return true;
    }
    return false;
  } catch {
    // A tainted canvas should be impossible for a same-origin file, but a
    // failed read must never be louder than the still it falls back to.
    return null;
  }
}
