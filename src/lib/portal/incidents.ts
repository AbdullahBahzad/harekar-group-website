import { prisma } from "@/lib/prisma";

/** One row of the portal's Incident Feed. */
export type PortalIncident = {
  id: string;
  label: string;
  severity: "CLEAR" | "ELEVATED" | "CRITICAL";
  headline: string | null;
  body: string | null;
  category: string | null;
  method: string | null;
  actor: string | null;
  target: string | null;
  province: string | null;
  city: string | null;
  resolved: boolean;
  /** When the incident happened, falling back to when it was filed — a
   * marker created without a specific occurrence time still needs a place
   * in the feed's chronological order. */
  occurredAt: string;
};

/**
 * Every published incident, most recent first, for the portal's Incident
 * Feed — unlike the live map (`getPublishedMarkers`), a resolved incident
 * stays in this list: the feed is a log of what happened, not a picture of
 * what is still open.
 *
 * Only ever called for an entitled reader (every portal page is behind
 * `requirePortalUser`), so headline and body are always attached — there is
 * no partial, teaser version of this list the way the public map has one.
 */
export async function getIncidentFeed(take = 200): Promise<PortalIncident[]> {
  const rows = await prisma.intelMarker.findMany({
    where: { published: true },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take,
    select: {
      id: true,
      label: true,
      severity: true,
      headline: true,
      body: true,
      category: true,
      method: true,
      actor: true,
      target: true,
      province: true,
      city: true,
      resolved: true,
      occurredAt: true,
      createdAt: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    severity: row.severity,
    headline: row.headline,
    body: row.body,
    category: row.category,
    method: row.method,
    actor: row.actor,
    target: row.target,
    province: row.province,
    city: row.city,
    resolved: row.resolved,
    occurredAt: (row.occurredAt ?? row.createdAt).toISOString(),
  }));
}
