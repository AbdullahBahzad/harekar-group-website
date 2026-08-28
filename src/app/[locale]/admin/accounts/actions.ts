"use server";

import { revalidatePath } from "next/cache";
import { hasLocale } from "next-intl";
import bcrypt from "bcryptjs";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extendProUntil } from "@/lib/entitlement";
import { locales } from "@/i18n/routing";

/** Same cost factor as registration — one password-hashing policy, not two. */
const BCRYPT_ROUNDS = 12;
/** Shortest password accepted. Matches the public registration form. */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Every mutation re-checks admin rights.
 *
 * A server action is a public HTTP endpoint — guarding only the page that
 * renders the form leaves the action callable by anyone who can read its id
 * out of the page source.
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

/**
 * Refreshes both surfaces an entitlement change is visible on.
 *
 * The dashboard reads subscriber totals and the activity feed straight from
 * these tables, so comping Pro or granting console access without invalidating
 * it leaves the first screen an operator sees disagreeing with the one they
 * just used.
 */
function revalidateAccounts() {
  revalidatePath("/[locale]/admin/accounts", "page");
  revalidatePath("/[locale]/admin", "page");
}

/** Permanent comped Pro, independent of any purchase. */
export async function toggleUserPro(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing user id");

  const user = await prisma.user.findUnique({
    where: { id },
    select: { isPro: true },
  });
  if (!user) throw new Error("Unknown user");

  await prisma.user.update({
    where: { id },
    data: { isPro: !user.isPro },
  });

  revalidateAccounts();
}

/** Grants a fixed period of purchased-equivalent access. */
export async function grantProPeriod(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const days = Number(formData.get("days") ?? 30);
  if (!id) throw new Error("Missing user id");
  if (!Number.isFinite(days) || days <= 0) throw new Error("Invalid period");

  const user = await prisma.user.findUnique({
    where: { id },
    select: { proUntil: true },
  });
  if (!user) throw new Error("Unknown user");

  await prisma.user.update({
    where: { id },
    // Stacks onto remaining time rather than resetting it — the same rule a
    // paid renewal follows, so a comped extension cannot cost someone days.
    data: { proUntil: extendProUntil(user.proUntil, days) },
  });

  revalidateAccounts();
}

/**
 * Grants or revokes console access.
 *
 * An administrator cannot change their own. Doing so is almost always a
 * misclick, and on a single-admin deployment it locks the console permanently
 * with no way back short of editing the database by hand.
 */
export async function toggleUserAdmin(formData: FormData) {
  const operatorId = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing user id");
  if (id === operatorId) throw new Error("You cannot change your own access");

  const user = await prisma.user.findUnique({
    where: { id },
    select: { isAdmin: true },
  });
  if (!user) throw new Error("Unknown user");

  await prisma.user.update({
    where: { id },
    data: { isAdmin: !user.isAdmin },
  });

  revalidateAccounts();
}


/* ---- operators ----------------------------------------------------------- */

export type OperatorFormState = {
  status: "idle" | "error" | "success";
  /*
   * A key under `admin.operators`, not a sentence.
   *
   * The console renders in three languages and this outcome is shown inline in
   * the panel. Returning English here would make the one line the operator
   * actually needs to read the one line that never translates — so the action
   * returns what happened and the panel says it in the reader's language.
   */
  messageKey?: string;
  /** Interpolation values for `messageKey`. */
  values?: Record<string, string>;
  /*
   * Echoed back on failure. React 19 resets uncontrolled fields once an action
   * completes, so without this a rejected grant costs the operator the address
   * they just typed.
   */
  email?: string;
};

/**
 * Grants console access by email — to an existing account, or to a brand new
 * one, created here with the password supplied alongside it.
 *
 * The password is mandatory, not an optional extra: this is the only place
 * an operator account gets a password set on it through the console, so
 * requiring it means every account this form touches leaves with working,
 * known credentials rather than depending on whether the person happened to
 * register on the public site first.
 *
 * An email that already belongs to an admin is refused rather than silently
 * rewriting their password — the button says "grant access", and resetting
 * someone else's credentials is a deliberate act this form does not do by
 * accident.
 */
export async function grantAdminByEmail(
  _prevState: OperatorFormState,
  formData: FormData,
): Promise<OperatorFormState> {
  try {
    await assertAdmin();
  } catch {
    return { status: "error", messageKey: "notAuthorised" };
  }


  // Registration lowercases addresses, so the lookup must too.
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email) {
    return { status: "error", messageKey: "enterEmail" };
  }
  if (!password) {
    return { status: "error", messageKey: "enterPassword", email };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { status: "error", messageKey: "errorPasswordShort", email };
  }

  /*
   * The lookup and the write are wrapped together. An unhandled throw here
   * replaces the page with an error overlay and loses whatever the operator
   * typed; a returned message keeps them in the form and tells them what
   * happened.
   */
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, isAdmin: true },
    });

    if (!user) {
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const created = await prisma.user.create({
        data: { email, passwordHash, isAdmin: true },
      });

      revalidateAccounts();
      return {
        status: "success",
        messageKey: "created",
        values: { who: created.name ?? email },
      };
    }

    if (user.isAdmin) {
      return {
        status: "error",
        messageKey: "alreadyOperator",
        values: { who: user.name ?? email },
        email,
      };
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: { isAdmin: true, passwordHash },
    });

    revalidateAccounts();
    return {
      status: "success",
      messageKey: "grantedWithPassword",
      values: { who: user.name ?? email },
    };
  } catch (error) {
    console.error("Failed to grant console access", error);
    return {
      status: "error",
      messageKey: "databaseUnreachable",
      email,
    };
  }
}

/**
 * Ends the session and returns to the sign-in page.
 *
 * Deliberately the login screen rather than the public home page: signing out
 * of an operational console should leave you at the door, not wandering the
 * marketing site. It carries `next` so signing back in returns to the console
 * instead of the customer account page.
 *
 * A POST, not a link: a GET that destroys a session can be triggered by any
 * prefetch or image tag pointing at it.
 */
export async function signOutOperator(formData: FormData) {
  // Validated against the known set, not trusted: it is interpolated into a
  // redirect path, the same reason the sign-in actions check it.
  const raw = String(formData.get("locale") ?? "");
  const locale = hasLocale(locales, raw) ? raw : "en";

  await signOut({
    redirectTo: `/${locale}/login?next=${encodeURIComponent(`/${locale}/admin`)}`,
  });
}
