import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Whether the console may be opened without signing in.
 *
 * Off unless `ADMIN_PREVIEW=1` is set explicitly, and impossible in
 * production regardless. This exists purely so the console's design can be
 * reviewed on a machine with no database — it is not a convenience, and it is
 * not on by default.
 *
 * It was previously enabled by merely running in development, which meant any
 * developer machine served the console to anyone who could reach the port.
 * Requiring the flag makes opening that door a deliberate act with a name.
 */
const previewUnlocked =
  process.env.NODE_ENV !== "production" && process.env.ADMIN_PREVIEW === "1";

export type ConsoleOperator = {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  canManageReports: boolean;
};

/**
 * The shared lookup behind both gates below.
 *
 * Anyone who is not a signed-in operator gets the site's ordinary 404 — not a
 * sign-in prompt, and not a bounce to the home page. A login form at the
 * console's address announces that there is a console there worth attacking;
 * a plain "page not found" (identical to any mistyped address, see
 * `[locale]/not-found.tsx`) gives nothing away. Operators sign in through the
 * normal sign-in page first, then open the console.
 *
 * One query, one preview fallback, one "outage locks the console" rule —
 * `requireAdmin` and `requireReportsAccess` differ only in which flag they
 * accept, not in how the operator is found.
 */
async function loadOperator(): Promise<ConsoleOperator> {
  const session = await auth();

  if (!session?.user?.id) {
    if (previewUnlocked && (await databaseUnreachable())) {
      return PREVIEW_OPERATOR;
    }
    notFound();
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        canManageReports: true,
      },
    });
    if (!user) notFound();
    return user;
  } catch (error) {
    /*
     * The database is the only authority on who is an administrator, so an
     * outage cannot be waved through — the console is locked until it is back.
     * The preview flag is the single deliberate exception.
     */
    if (!previewUnlocked) throw error;
    return PREVIEW_OPERATOR;
  }
}

/**
 * The console's front door — full access only.
 *
 * Every page except the Sources/Reports station calls this before rendering
 * anything. Read from the database on each request rather than from the
 * session token — the token is only refreshed every 24 hours, and an
 * administrator whose access has been revoked must lose it immediately, not
 * tomorrow. One indexed lookup per admin page view is a fair price for that.
 *
 * A signed-out visitor is sent to sign in, carrying `next` so they land back
 * here afterwards. A signed-in non-admin — including a reports-only operator,
 * who belongs on their one station and nowhere else in the console — is sent
 * home rather than to an "access denied" screen, which would confirm the
 * console exists at this address.
 */
export async function requireAdmin(): Promise<ConsoleOperator> {
  const operator = await loadOperator();
  if (!operator.isAdmin) notFound();
  return operator;
}

/**
 * The narrower front door: full admins and reports-only operators alike.
 *
 * Used by the console layout itself (so a reports-only operator can reach
 * their one station at all) and by the Sources/Reports station's own page.
 * Every *other* page still calls `requireAdmin` above and stays closed to a
 * reports-only operator — this function does not widen anything else.
 */
/**
 * Whether the visitor may see the console at all, as a yes/no rather than a
 * 404 — for code that must behave identically for strangers instead of
 * stopping the render (the console's page title, see the admin layout).
 * Same rule as `requireReportsAccess`, preview fallback included.
 */
export async function isConsoleOperator(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) {
    return previewUnlocked && (await databaseUnreachable());
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true, canManageReports: true },
    });
    return Boolean(user?.isAdmin || user?.canManageReports);
  } catch {
    return previewUnlocked;
  }
}

export async function requireReportsAccess(): Promise<ConsoleOperator> {
  const operator = await loadOperator();
  if (!operator.isAdmin && !operator.canManageReports) {
    notFound();
  }
  return operator;
}

/** Stands in for a signed-in administrator while the console is previewed. */
const PREVIEW_OPERATOR: ConsoleOperator = {
  id: "preview-operator",
  name: "Preview",
  email: "preview@localhost",
  isAdmin: true,
  canManageReports: false,
};

/**
 * True when Postgres cannot be reached at all.
 *
 * Checked with the cheapest possible round trip so the preview path is only
 * taken for a genuine outage — never to wave through an unauthenticated
 * visitor against a database that is up and would have rejected them.
 */
async function databaseUnreachable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return false;
  } catch {
    return true;
  }
}
