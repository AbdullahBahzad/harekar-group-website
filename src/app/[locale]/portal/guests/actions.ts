"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { getAppOrigin } from "@/lib/app-url";
import { withinRateLimit } from "@/lib/rate-limit";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Invites per account per day — a Pro subscriber inviting their own
 * colleagues, not a mailing list. */
const INVITE_LIMIT = 15;
const INVITE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * The only account allowed to invite: signed in, Pro, and not itself a guest
 * seat — re-checked against the database rather than trusted from the
 * session, the same reason every admin action re-checks `isAdmin`.
 */
async function assertPortalOwner() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, isPro: true, guestOf: true },
  });
  if (!user?.isPro || user.guestOf !== null) {
    throw new Error("Not authorised to manage guests");
  }

  return user;
}

function revalidateGuests() {
  revalidatePath("/[locale]/portal/guests", "page");
}

export type InviteGuestState = {
  status: "idle" | "invited" | "error";
  email?: string;
  /** A key under `portal.guests`. */
  errorKey?: "errorEmail" | "errorAlreadyGuest" | "errorTooMany" | "errorGeneric";
};

/**
 * Invites a colleague under the caller's own Pro subscription.
 *
 * Upserts on `(ownerId, email)`: re-inviting an address already pending just
 * issues a fresh token and email rather than piling up a second invite, and
 * re-inviting one that was revoked reopens it — the same "no duplicate rows
 * for the same real-world thing" rule `ReportRecipient` follows.
 */
export async function inviteGuest(
  _prevState: InviteGuestState,
  formData: FormData,
): Promise<InviteGuestState> {
  const owner = await assertPortalOwner();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    return { status: "error", errorKey: "errorEmail" };
  }
  if (email === owner.email.toLowerCase()) {
    return { status: "error", errorKey: "errorAlreadyGuest" };
  }

  if (!withinRateLimit(`portal-invite:${owner.id}`, INVITE_LIMIT, INVITE_WINDOW_MS)) {
    return { status: "error", errorKey: "errorTooMany", email };
  }

  const existing = await prisma.portalGuest.findUnique({
    where: { ownerId_email: { ownerId: owner.id, email } },
    select: { status: true },
  });
  if (existing?.status === "ACCEPTED") {
    return { status: "error", errorKey: "errorAlreadyGuest", email };
  }

  const token = randomBytes(24).toString("hex");

  await prisma.portalGuest.upsert({
    where: { ownerId_email: { ownerId: owner.id, email } },
    create: { ownerId: owner.id, email, token, status: "PENDING" },
    update: { token, status: "PENDING", acceptedAt: null, revokedAt: null },
  });

  const origin = await getAppOrigin();
  const joinUrl = `${origin}/en/join?token=${token}`;
  const inviterName = owner.name ?? owner.email;

  await sendMail({
    to: email,
    subject: `${inviterName} invited you to the Harekar Group client portal`,
    text: [
      `${inviterName} has given you access to Harekar Group's client portal —`,
      "the same daily briefs, incident feed and map their account sees.",
      "",
      `Accept the invite: ${joinUrl}`,
      "",
      "If you weren't expecting this, you can ignore this email.",
      "",
      "— Harekar Group",
    ].join("\n"),
    replyTo: owner.email,
  });

  revalidateGuests();
  return { status: "invited", email };
}

export async function revokeGuest(formData: FormData) {
  const owner = await assertPortalOwner();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing guest id");

  const guest = await prisma.portalGuest.findUnique({
    where: { id },
    select: { ownerId: true, accountId: true },
  });
  if (!guest || guest.ownerId !== owner.id) throw new Error("Unknown guest");

  await prisma.$transaction([
    prisma.portalGuest.update({
      where: { id },
      data: { status: "REVOKED", revokedAt: new Date(), token: null },
    }),
    // Turns Pro back off for the seat itself — see the model's own doc for
    // the one honest limitation this carries.
    ...(guest.accountId
      ? [
          prisma.user.update({
            where: { id: guest.accountId },
            data: { isPro: false },
          }),
        ]
      : []),
  ]);

  revalidateGuests();
}
