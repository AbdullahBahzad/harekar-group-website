import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";

/**
 * Email confirmation by one-time code.
 *
 * A new account cannot sign in until its owner proves the address is theirs
 * by typing the 6-digit code mailed to it. Codes live in Auth.js's own
 * `VerificationToken` table — built for exactly this — keyed by
 * `verify:<email>`, and only as a keyed hash: a database read never yields a
 * usable code. Each new code replaces the last, and expires after 10 minutes.
 *
 * Guessing is bounded by the callers' rate limits (see the auth actions): a
 * handful of attempts per address per window, against a million codes.
 */
const CODE_TTL_MS = 10 * 60 * 1000;
const identifierFor = (email: string) => `verify:${email}`;

function hashCode(email: string, code: string): string {
  // AUTH_SECRET as a pepper, so a leaked table cannot be brute-forced offline.
  return createHash("sha256")
    .update(`${process.env.AUTH_SECRET ?? ""}:${email}:${code}`)
    .digest("hex");
}

/** Issues a fresh code for `email`, replacing any earlier one, and mails it. */
export async function sendVerificationCode(email: string, locale: string): Promise<boolean> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const identifier = identifierFor(email);

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: { identifier, token: hashCode(email, code), expires: new Date(Date.now() + CODE_TTL_MS) },
    }),
  ]);

  const t = await getTranslations({ locale, namespace: "auth.verify.email" });
  return sendMail({
    to: email,
    subject: t("subject", { code }),
    text: t("body", { code, minutes: CODE_TTL_MS / 60_000 }),
  });
}

export type CodeCheck = "ok" | "invalid" | "expired";

/**
 * Checks a typed code. On a match the account's email is marked confirmed and
 * the code is used up; a wrong or expired code changes nothing.
 */
export async function confirmEmailWithCode(email: string, code: string): Promise<CodeCheck> {
  const identifier = identifierFor(email);
  const stored = await prisma.verificationToken.findFirst({ where: { identifier } });
  if (!stored) return "invalid";

  const expected = Buffer.from(stored.token, "hex");
  const given = Buffer.from(hashCode(email, code), "hex");
  const matches = expected.length === given.length && timingSafeEqual(expected, given);
  if (!matches) return "invalid";
  if (stored.expires.getTime() < Date.now()) return "expired";

  await prisma.$transaction([
    prisma.user.updateMany({
      where: { email, emailVerified: null },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.deleteMany({ where: { identifier } }),
  ]);
  return "ok";
}
