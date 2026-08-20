/**
 * Client logo wall data.
 *
 * Every source file is a 1772x1772 PNG holding PURE WHITE artwork on
 * transparency — there is no colour in any of them, so they only read against a
 * dark surface. Each file also bakes in its own arbitrary padding, and the
 * artwork inside ranges from a 10.3:1 hairline wordmark to a 0.47:1 upright
 * crest.
 *
 * Dropping those into a uniform grid with `object-contain` is what makes logo
 * walls look broken: the box is normalised but the *ink* is not, so wide
 * wordmarks render as threads next to crests that fill their cell.
 *
 * These numbers fix that. Measured off the real alpha channel (see the bbox
 * pass in the commit that added this file), then normalised so every logo has
 * the same optical mass — equal geometric mean of content width and height —
 * rather than the same bounding box, and clamped so nothing overflows its cell.
 *
 *   w        img width, as a % of the cell width
 *   cx, cy   content centre inside the source square, as a %, used to pull the
 *            real artwork to the cell centre instead of the file's own centre
 */
export type ClientLogo = {
  /** File number in /public/clients. */
  n: string;
  category: ClientCategory;
  w: number;
  cx: number;
  cy: number;
  /**
   * Client name, when known. The source site shipped these with alt text of
   * "NGOS 1", "LOCALS 24" and so on, so no real names are recoverable from it —
   * fill these in and the alt text and tooltip pick them up automatically.
   */
  name?: string;
};

export const clientCategories = ["ngos", "energy", "consulates", "locals"] as const;
export type ClientCategory = (typeof clientCategories)[number];

/** Cell aspect ratio the `w` values were solved against. */
export const LOGO_CELL_ASPECT = 2.4;

export const clientLogos: ClientLogo[] = [
  { n: "01", category: "ngos", w: 30.6, cx: 50, cy: 49.5 },
  { n: "02", category: "ngos", w: 44.6, cx: 50, cy: 52.1 },
  { n: "03", category: "ngos", w: 39, cx: 51.4, cy: 52.8 },
  { n: "04", category: "ngos", w: 39.9, cx: 50.2, cy: 51.2 },
  { n: "05", category: "ngos", w: 30.6, cx: 50.9, cy: 51.2 },
  { n: "06", category: "ngos", w: 30.7, cx: 50.5, cy: 46.6 },
  { n: "07", category: "ngos", w: 27.9, cx: 52.6, cy: 51.2 },
  { n: "08", category: "ngos", w: 38.7, cx: 50.5, cy: 43.8 },
  { n: "09", category: "energy", w: 53.3, cx: 51.6, cy: 50 },
  { n: "10", category: "energy", w: 57.3, cx: 50.7, cy: 53.3 },
  { n: "11", category: "energy", w: 50.5, cx: 51.5, cy: 52 },
  { n: "12", category: "energy", w: 40, cx: 49.1, cy: 51.2 },
  { n: "13", category: "energy", w: 34.1, cx: 49.9, cy: 49.6 },
  { n: "14", category: "energy", w: 42.4, cx: 50.2, cy: 47.3 },
  { n: "15", category: "energy", w: 45, cx: 50.4, cy: 50 },
  { n: "16", category: "energy", w: 80.2, cx: 51.5, cy: 54.4 },
  { n: "17", category: "energy", w: 92.7, cx: 49.8, cy: 52.6 },
  { n: "18", category: "consulates", w: 30.8, cx: 50.1, cy: 50 },
  { n: "19", category: "consulates", w: 28.7, cx: 50, cy: 51.7 },
  { n: "20", category: "consulates", w: 31.4, cx: 50, cy: 47.3 },
  { n: "21", category: "consulates", w: 32.9, cx: 50.6, cy: 51.1 },
  { n: "22", category: "consulates", w: 36.3, cx: 47.9, cy: 47.4 },
  { n: "23", category: "consulates", w: 35.8, cx: 50, cy: 49.9 },
  { n: "24", category: "locals", w: 35.6, cx: 51.7, cy: 51 },
  { n: "25", category: "locals", w: 40.3, cx: 50.2, cy: 47.8 },
  { n: "26", category: "locals", w: 33.6, cx: 52.3, cy: 46.9 },
  { n: "27", category: "locals", w: 34.3, cx: 51.6, cy: 42 },
  { n: "28", category: "locals", w: 44.8, cx: 50.4, cy: 49.3 },
  { n: "29", category: "locals", w: 61.9, cx: 50.7, cy: 47.4 },
  { n: "30", category: "locals", w: 47.6, cx: 50.2, cy: 48.9 },
  { n: "31", category: "locals", w: 35.7, cx: 50.4, cy: 49.8 },
  { n: "32", category: "locals", w: 47.1, cx: 51.5, cy: 50.2 },
  { n: "33", category: "locals", w: 39, cx: 49.5, cy: 48.3 },
  { n: "35", category: "locals", w: 36.6, cx: 51.5, cy: 43.9 },
  { n: "36", category: "locals", w: 43.5, cx: 50.6, cy: 48 },
  { n: "37", category: "locals", w: 56.5, cx: 50.7, cy: 53.4 },
  { n: "38", category: "locals", w: 37.7, cx: 49.8, cy: 44.6 },
  { n: "39", category: "locals", w: 38, cx: 47.6, cy: 48 },
];
