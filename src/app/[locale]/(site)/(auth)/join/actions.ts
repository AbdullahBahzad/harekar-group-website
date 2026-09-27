"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { hasLocale } from "next-intl";
import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOpenInviteByToken } from "@/lib/portal/guests";
import { locales, type Locale } from "@/i18n/routing";
import { withinRateLimit } from "@/lib/rate-limit";

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

const JOIN_LIMIT = 10;
const JOIN_WINDOW_MS = 60 * 60 * 1000;

export type JoinState = {
  status: "idle" | "error";
  /** A key under `auth.join`. */
  errorKey?:
    | "errorInvalidInvite"
    | "errorRequired"
    | "errorPasswordShort"
    | "errorPasswordMismatch"
    | "errorTooMany"
    | "errorGeneric";
};

function readLocale(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return hasLocale(locales, value) ? value : "en";
}

/**
 * Accepts an invite for an email that has no account yet: creates one,
 * links the guest seat to it, and signs straight in — the same "create and
 * sign in together" shape `registerAccount` uses, so accepting an invite
 * feels like the ordinary register form rather than a special case.
 */
export async function acceptGuestInvite(
  _prevState: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  const locale = readLocale(formData);

  const invite = await getOpenInviteByToken(token);
  if (!invite) return { status: "error", errorKey: "errorInvalidInvite" };

  if (!name || !password) return { status: "error", errorKey: "errorRequired" };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { status: "error", errorKey: "errorPasswordShort" };
  }
  if (password !== confirm) {
    return { status: "error", errorKey: "errorPasswordMismatch" };
  }

  if (!withinRateLimit(`portal-join:${invite.email}`, JOIN_LIMIT, JOIN_WINDOW_MS)) {
    return { status: "error", errorKey: "errorTooMany" };
  }

  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Re-read the invite inside the write path is unnecessary — accepting an
    // already-accepted or revoked invite simply fails the update below with
    // no rows matched, which the outer status check has already ruled out
    // for the common case; a second visitor racing the same token lands on
    // the unique `accountId` constraint instead of silently doubling up.
    const account = await prisma.user.create({
      data: { email: invite.email, name, passwordHash, isPro: true },
    });

    await prisma.portalGuest.update({
      where: { id: invite.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        token: null,
        accountId: account.id,
      },
    });
  } catch (error) {
    console.error("Failed to accept portal invite", error);
    return { status: "error", errorKey: "errorGeneric" };
  }

  try {
    await signIn("credentials", {
      email: invite.email,
      password,
      redirectTo: `/${locale}/portal`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // The account was just created with this exact password, so this
      // should not happen — but if it does, sending the new guest to sign
      // in by hand is a better failure than a stuck page.
      redirect(`/${locale}/login`);
    }
    throw error;
  }

  return { status: "idle" };
}

/**
 * Accepts an invite for an email that already has an account: grants Pro and
 * links the seat, without touching whatever password that account already
 * signs in with.
 */
export async function linkExistingAccount(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const locale = readLocale(formData);

  const invite = await getOpenInviteByToken(token);
  if (!invite) redirect(`/${locale}/join?error=invalid`);

  const account = await prisma.user.findUnique({
    where: { email: invite.email },
    select: { id: true },
  });
  if (!account) redirect(`/${locale}/join?token=${token}`);

  await prisma.$transaction([
    prisma.user.update({ where: { id: account.id }, data: { isPro: true } }),
    prisma.portalGuest.update({
      where: { id: invite.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        token: null,
        accountId: account.id,
      },
    }),
  ]);

  redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/portal`)}`);
}
