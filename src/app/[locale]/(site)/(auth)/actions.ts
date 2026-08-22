"use server";

import { AuthError } from "next-auth";
import { hasLocale } from "next-intl";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { locales, type Locale } from "@/i18n/routing";
import { safeInternalPath } from "@/lib/safe-redirect";
import { clientKey, withinRateLimit } from "@/lib/rate-limit";

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
    await prisma.user.create({ data: { name, email, passwordHash } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { status: "error", error: "errorEmailTaken", values: typed };
    }
    console.error("Failed to register account", error);
    return { status: "error", error: "errorGeneric", values: typed };
  }

  return signInWithPassword(email, password, next, typed);
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

  return signInWithPassword(email, password, next, { email });
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
): Promise<AuthFormState> {
  try {
    await signIn("credentials", { email, password, redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        status: "error",
        error:
          error.type === "CredentialsSignin"
            ? "errorCredentials"
            : "errorGeneric",
        values,
      };
    }
    throw error;
  }

  return { status: "idle" };
}
