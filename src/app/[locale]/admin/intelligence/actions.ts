"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { IRAQ_BOUNDS } from "@/data/iraq";

/**
 * Every mutation re-checks admin rights.
 *
 * A server action is a public HTTP endpoint. Guarding only the page that
 * renders the form leaves the action itself callable by anyone who can read
 * its id out of the page source — the check has to live on the action.
 */
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

const SEVERITIES = ["CLEAR", "ELEVATED", "CRITICAL"] as const;
const ACCESS = ["OPEN", "LOCKED"] as const;
/** Admiralty source-reliability grades. Empty string means not assessed. */
const RELIABILITIES = ["", "A", "B", "C", "D", "E", "F"] as const;
/** Admiralty information-credibility grades. Empty string means not assessed. */
const CREDIBILITIES = ["", "1", "2", "3", "4", "5", "6"] as const;

type Severity = (typeof SEVERITIES)[number];
type Access = (typeof ACCESS)[number];

/** Trimmed text field, or `null` when blank — mirrors `headline`/`body`. */
function optionalText(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

/**
 * A `datetime-local` input value, or `null` when blank.
 *
 * The browser sends this with no timezone offset. It is stored and later
 * displayed as the wall-clock time the analyst typed, not converted — this
 * console has one timezone of user, so there is nothing to convert against.
 */
function optionalDateTime(formData: FormData, key: string): Date | null {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${key}`);
  return date;
}

/** The incident-detail fields, read together since every one is optional. */
function readIncidentDetail(formData: FormData) {
  const sourceReliability = String(formData.get("sourceReliability") ?? "");
  const infoCredibility = String(formData.get("infoCredibility") ?? "");
  if (!RELIABILITIES.includes(sourceReliability as (typeof RELIABILITIES)[number])) {
    throw new Error("Unknown source reliability grade");
  }
  if (!CREDIBILITIES.includes(infoCredibility as (typeof CREDIBILITIES)[number])) {
    throw new Error("Unknown information credibility grade");
  }

  return {
    category: optionalText(formData, "category"),
    incidentType: optionalText(formData, "incidentType"),
    keyPoints: optionalText(formData, "keyPoints"),
    occurredAt: optionalDateTime(formData, "occurredAt"),
    method: optionalText(formData, "method"),
    actor: optionalText(formData, "actor"),
    actorDetail: optionalText(formData, "actorDetail"),
    target: optionalText(formData, "target"),
    targetDetail: optionalText(formData, "targetDetail"),
    sourceReliability: sourceReliability || null,
    infoCredibility: infoCredibility || null,
    facility: optionalText(formData, "facility"),
    streetAddress: optionalText(formData, "streetAddress"),
    city: optionalText(formData, "city"),
    district: optionalText(formData, "district"),
    province: optionalText(formData, "province"),
    sourceName: optionalText(formData, "sourceName"),
    sourceUrl: optionalText(formData, "sourceUrl"),
    sourcePublishedAt: optionalDateTime(formData, "sourcePublishedAt"),
    sourceText: optionalText(formData, "sourceText"),
  };
}

/**
 * Coordinates are clamped to Iraq's bounding box.
 *
 * The console places markers by clicking a map, so a stray click near the edge
 * can produce a point just outside the border. Clamping keeps every marker
 * projectable onto the map the public sees, which cannot render a point it has
 * no space for.
 */
function clampCoordinates(longitude: number, latitude: number) {
  return {
    longitude: Math.min(
      IRAQ_BOUNDS.maxLon,
      Math.max(IRAQ_BOUNDS.minLon, longitude),
    ),
    latitude: Math.min(
      IRAQ_BOUNDS.maxLat,
      Math.max(IRAQ_BOUNDS.minLat, latitude),
    ),
  };
}

function readMarkerForm(formData: FormData) {
  const label = String(formData.get("label") ?? "").trim();
  const longitude = Number(formData.get("longitude"));
  const latitude = Number(formData.get("latitude"));
  const severity = String(formData.get("severity") ?? "CLEAR") as Severity;
  const access = String(formData.get("access") ?? "OPEN") as Access;
  const headline = String(formData.get("headline") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const published = formData.get("published") === "on";
  const resolved = formData.get("resolved") === "on";

  if (!label) throw new Error("A marker needs a label");
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    throw new Error("Coordinates must be numbers");
  }
  if (!SEVERITIES.includes(severity)) throw new Error("Unknown severity");
  if (!ACCESS.includes(access)) throw new Error("Unknown access level");

  return {
    label,
    ...clampCoordinates(longitude, latitude),
    severity,
    access,
    headline: headline || null,
    body: body || null,
    published,
    resolved,
    ...readIncidentDetail(formData),
  };
}

/*
 * Both the console and the public map are revalidated after every write.
 * Changing the operational picture and having the public map keep serving the
 * previous one for the life of the cache entry would make the console a liar.
 */
function revalidateIntel() {
  revalidatePath("/[locale]/admin/intelligence", "page");
  /*
   * The `(site)` group is part of the path `revalidatePath` matches on when
   * type is "page" — see the route-group examples in its API reference. These
   * two previously read `/[locale]/intelligence` and `/[locale]`, which are
   * not routes this app has, so they matched nothing: every other station
   * refreshed its public page after a write and this one silently did not.
   */
  revalidatePath("/[locale]/(site)/intelligence", "page");
  revalidatePath("/[locale]/(site)", "page");
  // The dashboard's posture panel and marker counts are read from this table.
  revalidatePath("/[locale]/admin", "page");
}

export async function createMarker(formData: FormData) {
  const operatorId = await assertAdmin();
  const data = readMarkerForm(formData);

  await prisma.intelMarker.create({
    data: { ...data, updatedById: operatorId },
  });

  revalidateIntel();
}

export async function updateMarker(formData: FormData) {
  const operatorId = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing marker id");

  /*
   * The revision the editor was opened at, not the current one — that is the
   * entire mechanism. A save carries the value it last *read*, and the write
   * below only succeeds if the row is still at that value, so two operators
   * opening the same marker and saving in turn get one success and one
   * rejection instead of the second silently discarding the first's edit.
   */
  const expectedRevision = Number(formData.get("revision"));
  if (!Number.isInteger(expectedRevision)) {
    throw new Error("Missing marker revision");
  }

  const data = readMarkerForm(formData);

  const result = await prisma.intelMarker.updateMany({
    where: { id, revision: expectedRevision },
    data: { ...data, updatedById: operatorId, revision: { increment: 1 } },
  });
  if (result.count === 0) {
    const stillExists = await prisma.intelMarker.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!stillExists) throw new Error("Unknown marker");
    throw new Error(
      "This marker changed in another session. Refresh and try again.",
    );
  }

  revalidateIntel();
}

export async function deleteMarker(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing marker id");

  await prisma.intelMarker.delete({ where: { id } });
  revalidateIntel();
}

/** Publishes or withdraws a marker without opening the editor. */
export async function toggleMarkerPublished(formData: FormData) {
  const operatorId = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing marker id");

  const marker = await prisma.intelMarker.findUnique({
    where: { id },
    select: { published: true },
  });
  if (!marker) throw new Error("Unknown marker");

  await prisma.intelMarker.update({
    where: { id },
    data: {
      published: !marker.published,
      updatedById: operatorId,
      revision: { increment: 1 },
    },
  });

  revalidateIntel();
}

/**
 * Resolves or reopens a marker without going through the full editor — the
 * one-click counterpart to the "Edit / resolve" button on the reference
 * project's incident cards.
 */
export async function toggleMarkerResolved(formData: FormData) {
  const operatorId = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing marker id");

  const marker = await prisma.intelMarker.findUnique({
    where: { id },
    select: { resolved: true },
  });
  if (!marker) throw new Error("Unknown marker");

  await prisma.intelMarker.update({
    where: { id },
    data: {
      resolved: !marker.resolved,
      updatedById: operatorId,
      revision: { increment: 1 },
    },
  });

  revalidateIntel();
}

/**
 * Moves a marker, for drag-to-reposition on the console map.
 *
 * Separate from `updateMarker` so a drag does not have to round-trip the
 * headline and body — and so a drag can never blank them by submitting a form
 * whose text fields were not rendered.
 */
export async function moveMarker(
  id: string,
  longitude: number,
  latitude: number,
) {
  const operatorId = await assertAdmin();
  if (!id) throw new Error("Missing marker id");

  /*
   * The same finiteness check `readMarkerForm` applies. Arguments to a server
   * action arrive over the wire exactly as form fields do, so "it is typed
   * `number`" is a statement about the caller we wrote, not about the caller
   * this endpoint will get. NaN would otherwise pass straight through
   * `clampCoordinates`, which compares its way to NaN and stores it.
   */
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    throw new Error("Coordinates must be numbers");
  }

  await prisma.intelMarker.update({
    where: { id },
    data: {
      ...clampCoordinates(longitude, latitude),
      updatedById: operatorId,
      revision: { increment: 1 },
    },
  });

  revalidateIntel();
}

/**
 * Copies the original hardcoded marker list into the database.
 *
 * The public map shipped with five markers compiled into the bundle. This
 * imports them once so the console starts from the real picture rather than an
 * empty country. It is a no-op when markers already exist, so pressing it
 * twice cannot duplicate anything.
 */
export async function seedFromStaticMarkers() {
  const operatorId = await assertAdmin();

  const existing = await prisma.intelMarker.count();
  if (existing > 0) return;

  const { intelMarkers } = await import("@/data/iraq");

  await prisma.intelMarker.createMany({
    data: intelMarkers.map((marker, index) => ({
      label: marker.label,
      longitude: marker.coordinates[0],
      latitude: marker.coordinates[1],
      severity: marker.severity.toUpperCase() as Severity,
      access: marker.access.toUpperCase() as Access,
      published: true,
      sortOrder: index,
      updatedById: operatorId,
    })),
  });

  revalidateIntel();
}
