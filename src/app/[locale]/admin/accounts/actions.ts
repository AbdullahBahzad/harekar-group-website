"use server";

import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extendProUntil } from "@/lib/entitlement";

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

  revalidatePath("/[locale]/admin/accounts", "page");
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

  revalidatePath("/[locale]/admin/accounts", "page");
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

  revalidatePath("/[locale]/admin/accounts", "page");
}


/* ---- operators ----------------------------------------------------------- */

export type OperatorFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  /*
   * Echoed back on failure. React 19 resets uncontrolled fields once an action
   * completes, so without this a rejected grant costs the operator the address
   * they just typed.
   */
  email?: string;
};

/**
 * Grants console access to an existing account, by email.
 *
 * Deliberately requires the person to have registered first. Creating an
 * account here would mean inventing a password nobody chose, or emailing an
 * invite link — a whole delivery mechanism this project does not have. Asking
 * them to sign up first is one extra step for them and removes an entire class
 * of half-provisioned accounts.
 */
export async function grantAdminByEmail(
  _prevState: OperatorFormState,
  formData: FormData,
): Promise<OperatorFormState> {
  try {
    await assertAdmin();
  } catch {
    return { status: "error", message: "Not authorised." };
  }


  // Registration lowercases addresses, so the lookup must too.
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return { status: "error", message: "Enter an email address." };
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
      return {
        status: "error",
        message: `No account for ${email}. They must register on the site first.`,
        email,
      };
    }

    if (user.isAdmin) {
      return {
        status: "error",
        message: `${user.name ?? email} already has console access.`,
        email,
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isAdmin: true },
    });

    revalidatePath("/[locale]/admin/accounts", "page");
    return {
      status: "success",
      message: `Console access granted to ${user.name ?? email}.`,
    };
  } catch (error) {
    console.error("Failed to grant console access", error);
    return {
      status: "error",
      message: "Could not reach the database. Nothing was changed.",
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
  const locale = String(formData.get("locale") ?? "en");
  await signOut({
    redirectTo: `/${locale}/login?next=${encodeURIComponent(`/${locale}/admin`)}`,
  });
}
