import type { LngLat } from "@/data/iraq";

/**
 * The four offices, in the Kurdistan Region of Iraq.
 *
 * `mapQuery` holds the exact Google Maps place each office is listed under on
 * harekargroup.com, lifted from that site's own bundle. They resolve to the
 * businesses themselves, so the pin carries the company's name rather than a
 * bare coordinate label — and lands on the office rather than the city.
 *
 * `coordinates` are [longitude, latitude], read back from what Google
 * resolves those places to. They sit up to 4km from the city centres they
 * replaced: the Erbil office is north-west of the centre, Sulaymaniyah's
 * west of it.
 *
 * TODO: street address, phone, and email per office are not published on the
 * public site in a form that could be read, and third-party business
 * directories disagree. Fill `address`, `phone`, and `email` from the
 * company's own records — they render only once set, so nothing unverified
 * reaches the page in the meantime.
 */
export type Office = {
  /** Key into the `contact.offices` message namespace. */
  id: "erbil" | "duhok" | "sulaymaniyah" | "zakho";
  coordinates: LngLat;
  /**
   * What Google Maps is asked to show — the office's own place listing.
   * Null falls back to dropping a pin on `coordinates`, which is exact but
   * labels itself with its own numbers instead of the company's name.
   */
  mapQuery: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  /** Nudges the map label clear of a neighbouring marker. */
  labelAnchor: "start" | "middle" | "end";
};

/**
 * The company-wide contact address, as given by Harekar Group. Kept separate
 * from the offices because it is one shared inbox, not one per branch:
 * repeating it under each office would imply per-branch addresses that do
 * not exist.
 */
export const COMPANY_EMAIL = "info@harekargroup.com";

/** Where job applications and careers questions go, as given by the company. */
export const CAREERS_EMAIL = "hr@harekargroup.com";

export const offices: Office[] = [
  {
    id: "duhok",
    coordinates: [42.9803604, 36.8695415],
    // Listed under a Plus Code rather than a street address.
    mapQuery: "VX9J+P2G Harekar security, Duhok, Duhok Governorate",
    address: null,
    phone: null,
    email: null,
    labelAnchor: "end",
  },
  {
    id: "erbil",
    coordinates: [43.9736504, 36.2102928],
    mapQuery: "Harekar Group, Erbil, Kurdistan region, 44001",
    address: null,
    phone: null,
    email: null,
    labelAnchor: "middle",
  },
  {
    id: "sulaymaniyah",
    coordinates: [45.3905963, 35.5663555],
    mapQuery:
      "Harekar Security-Sulaimaniyah, Sulaymaniyah, Sulaymaniyah Governorate, 46001",
    address: null,
    phone: null,
    email: null,
    labelAnchor: "start",
  },
  {
    id: "zakho",
    /*
     * TODO: the Zakho office was added at the company's request (October
     * 2026) without an address or a Google Maps listing. Until one is
     * supplied, the map shows Zakho itself rather than guessing a building.
     * Replace `mapQuery` with the office's own listing (as for the others)
     * and `coordinates` with its exact position.
     */
    coordinates: [42.6818, 37.1436],
    mapQuery: "Zakho, Duhok Governorate, Iraq",
    address: null,
    phone: null,
    email: null,
    labelAnchor: "middle",
  },
];
