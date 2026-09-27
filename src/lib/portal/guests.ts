import { prisma } from "@/lib/prisma";

export type PortalGuestRow = {
  id: string;
  email: string;
  status: "PENDING" | "ACCEPTED" | "REVOKED";
  invitedAt: string;
  acceptedAt: string | null;
};

/** The seats one Pro account has invited, newest first. */
export async function getGuests(ownerId: string): Promise<PortalGuestRow[]> {
  const rows = await prisma.portalGuest.findMany({
    where: { ownerId },
    orderBy: { invitedAt: "desc" },
    select: {
      id: true,
      email: true,
      status: true,
      invitedAt: true,
      acceptedAt: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    status: row.status,
    invitedAt: row.invitedAt.toISOString(),
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
  }));
}

/** A still-open invite, by the token from its email link — for the public
 * `/join` page, which has no session to look anything up by yet. */
export async function getOpenInviteByToken(token: string) {
  if (!token) return null;

  const invite = await prisma.portalGuest.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      status: true,
      owner: { select: { name: true, email: true } },
    },
  });

  if (!invite || invite.status !== "PENDING") return null;
  return invite;
}
