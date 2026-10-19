"use server";

import { redirect } from "next/navigation";
import { AuthError, CredentialsSignin } from "next-auth";
import { hasLocale } from "next-intl";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { locales, type Locale } from "@/i18n/routing";
import { safeInternalPath } from "@/lib/safe-redirect";
import { clientKey, withinRateLimit } from "@/lib/rate-limit";
import { confirmEmailWithCode, sendVerificationCode } from "@/lib/email-verification";

/** Cost factor for password hashing. 12 is the current sensible default. */
const BCRYPT_ROUNDS = 12;

/** Shortest password accepted. Length beats composition rules for strength. */
const MIN_PASSWORD_LENGTH = 8;

/*
 * Deliberately permissive: the only email check worth doing here is that it
 * has a local part, an @, and a dot in the domain. Stricter patterns reject
 * valid addresses, and the real proof of ownership is a verification email.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/*
 * Attempt ceilings, per address.
 *
 * Sign-in is the one that matters: `authorize` runs bcrypt at twelve rounds on
 * every attempt, deliberately, and that cost is paid by this server. Unmetered,
 * the same property that makes the hash expensive to attack makes the endpoint
 * cheap to exhaust — a few hundred concurrent guesses is a CPU outage, quite
 * apart from whether any of them are correct.
 *
 * Both are set well above what a person fumbling a password will hit.
 */
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const REGISTER_LIMIT = 5;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;

/** Code attempts per address — a handful, against a million possible codes. */
const VERIFY_LIMIT = 8;
const VERIFY_WINDOW_MS = 15 * 60 * 1000;
/** Resends: one a minute, a few an hour, per address. */
const RESEND_GAP_MS = 60 * 1000;
const RESEND_LIMIT = 5;
const RESEND_WINDOW_MS = 60 * 60 * 1000;
const CODE_PATTERN = /^\d{6}$/;

/** The confirmation page, carrying who is confirming and where to go after. */
function verifyUrl(locale: Locale, email: string, next: string): string {
  const query = new URLSearchParams({ email, next });
  return `/${locale}/verify?${query.toString()}`;
}

export type AuthFormState = {
  status: "idle" | "error";
  /*
   * What the user typed, echoed back so a rejected submission does not empty
   * the form. React 19 resets uncontrolled fields once an action completes, so
   * without this every validation error costs the user their name and email.
   *
   * Passwords are deliberately never echoed — they would then sit in the
   * page's serialised state.
   */
  values?: { name?: string; email?: string };
  /** Translation key under the `auth` namespace. */
  error?:
    | "errorRequired"
    | "errorEmail"
    | "errorPasswordShort"
    | "errorPasswordMismatch"
    | "errorEmailTaken"
    | "errorCredentials"
    | "errorTooMany"
    | "errorGeneric";
};

/**
 * Creates an account and signs it straight in.
 *
 * Registering and then bouncing the user to a login form to retype what they
 * just typed is pure friction, so a successful create is followed immediately
 * by `signIn`.
 */
export async function registerAccount(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  const locale = readLocale(formData);
  const next = readNext(formData, locale);

  const typed = { name, email };

  if (!name || !email || !password) {
    return { status: "error", error: "errorRequired", values: typed };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { status: "error", error: "errorEmail", values: typed };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { status: "error", error: "errorPasswordShort", values: typed };
  }
  if (password !== confirm) {
    return { status: "error", error: "errorPasswordMismatch", values: typed };
  }

  // After validation, before the bcrypt hash below — the expensive part.
  if (
    !withinRateLimit(
      await clientKey("register"),
      REGISTER_LIMIT,
      REGISTER_WINDOW_MS,
    )
  ) {
    return { status: "error", error: "errorTooMany", values: typed };
  }

  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    /*
     * No "does this email exist" check first. Reading then writing leaves a
     * window where two simultaneous registrations both pass the check, so the
     * unique constraint is the thing actually relied on and the collision is
     * caught below.
     */
    try {
      await prisma.user.create({ data: { name, email, passwordHash } });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
        throw error;
      }
      /*
       * The address is already registered. If it was never confirmed, nobody
       * has proved they own it — so the person registering now may take it
       * over (new name and password) and receive the code. A confirmed
       * account is taken.
       */
      const existing = await prisma.user.findUnique({
        where: { email },
        select: { emailVerified: true, isAdmin: true },
      });
      if (!existing || existing.emailVerified || existing.isAdmin) {
        return { status: "error", error: "errorEmailTaken", values: typed };
      }
      await prisma.user.update({ where: { email }, data: { name, passwordHash } });
    }
    await sendVerificationCode(email, locale);
  } catch (error) {
    console.error("Failed to register account", error);
    return { status: "error", error: "errorGeneric", values: typed };
  }

  redirect(verifyUrl(locale, email, next));
}

/** Signs an existing account in. */
export async function loginAccount(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const locale = readLocale(formData);
  const next = readNext(formData, locale);

  if (!email || !password) {
    return { status: "error", error: "errorRequired", values: { email } };
  }

  // Before `signIn`, which is what pays for the bcrypt comparison.
  if (!withinRateLimit(await clientKey("login"), LOGIN_LIMIT, LOGIN_WINDOW_MS)) {
    return { status: "error", error: "errorTooMany", values: { email } };
  }

  return signInWithPassword(email, password, next, { email }, locale);
}

/**
 * The locale to land the user back in, taken from a hidden field on the form.
 *
 * Validated against the known set rather than trusted: it is interpolated into
 * a redirect path, and an unchecked value there is an open redirect.
 */
function readLocale(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return hasLocale(locales, value) ? value : "en";
}

/** Where to send the user after signing in; rejects off-site targets. */
function readNext(formData: FormData, locale: Locale): string {
  return safeInternalPath(
    String(formData.get("next") ?? ""),
    `/${locale}/account`,
  );
}

/**
 * The shared sign-in tail.
 *
 * `signIn` redirects by throwing, and that throw has to escape this function
 * for the redirect to happen — so `AuthError` is caught narrowly rather than
 * with a bare `catch`, which would swallow the redirect and leave the user
 * staring at a form that appears to do nothing.
 */
async function signInWithPassword(
  email: string,
  password: string,
  redirectTo: string,
  values: { name?: string; email?: string },
  locale: Locale,
): Promise<AuthFormState> {
  let unverified = false;
  try {
    await signIn("credentials", { email, password, redirectTo });
  } catch (error) {
    // Right password, unconfirmed address: send a fresh code (below).
    if (error instanceof CredentialsSignin && error.code === "unverified") {
      unverified = true;
    } else if (error instanceof AuthError) {
      return {
        status: "error",
        error:
          error.type === "CredentialsSignin"
            ? "errorCredentials"
            : "errorGeneric",
        values,
      };
    } else {
      throw error;
    }
  }

  if (unverified) {
    if (withinRateLimit(`resend:${email}`, RESEND_LIMIT, RESEND_WINDOW_MS)) {
      await sendVerificationCode(email, locale).catch((error) =>
        console.error("Failed to send verification code", error),
      );
    }
    redirect(verifyUrl(locale, email, redirectTo));
  }

  return { status: "idle" };
}

export type VerifyFormState = {
  status: "idle" | "error" | "sent";
  error?: "errorCode" | "errorExpired" | "errorTooMany" | "errorGeneric";
};

/** Checks the typed code; on success, on to sign-in with a confirmation note. */
export async function verifyEmailCode(
  _prevState: VerifyFormState,
  formData: FormData,
): Promise<VerifyFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "").replace(/\s+/g, "");
  const locale = readLocale(formData);
  const next = readNext(formData, locale);

  if (!EMAIL_PATTERN.test(email) || !CODE_PATTERN.test(code)) {
    return { status: "error", error: "errorCode" };
  }
  if (!withinRateLimit(`verify:${email}`, VERIFY_LIMIT, VERIFY_WINDOW_MS)) {
    return { status: "error", error: "errorTooMany" };
  }

  let result: Awaited<ReturnType<typeof confirmEmailWithCode>>;
  try {
    result = await confirmEmailWithCode(email, code);
  } catch (error) {
    console.error("Failed to check verification code", error);
    return { status: "error", error: "errorGeneric" };
  }
  if (result === "expired") return { status: "error", error: "errorExpired" };
  if (result !== "ok") return { status: "error", error: "errorCode" };

  const query = new URLSearchParams({ verified: "1", email, next });
  redirect(`/${locale}/login?${query.toString()}`);
}

/**
 * Sends a new code. Answers "sent" whether or not the address has an
 * unconfirmed account, so this cannot be used to discover who is registered.
 */
export async function resendVerificationCode(
  _prevState: VerifyFormState,
  formData: FormData,
): Promise<VerifyFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const locale = readLocale(formData);
  if (!EMAIL_PATTERN.test(email)) return { status: "error", error: "errorGeneric" };

  if (
    !withinRateLimit(`resend-gap:${email}`, 1, RESEND_GAP_MS) ||
    !withinRateLimit(`resend:${email}`, RESEND_LIMIT, RESEND_WINDOW_MS) ||
    !withinRateLimit(await clientKey("resend"), RESEND_LIMIT * 2, RESEND_WINDOW_MS)
  ) {
    return { status: "error", error: "errorTooMany" };
  }

  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { emailVerified: true } });
    if (user && !user.emailVerified) await sendVerificationCode(email, locale);
  } catch (error) {
    console.error("Failed to resend verification code", error);
  }
  return { status: "sent" };
}
