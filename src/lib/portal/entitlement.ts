import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type PortalUser = {
  id: string;
  name: string | null;
  email: string;
  /** Whether this account is a guest seat under someone else's subscription
   * — see `PortalGuest`. Guests get the same view as the account that
   * invited them, minus the ability to invite further guests themselves. */
  isGuest: boolean;
};

/**
 * The portal's front door.
 *
 * Every portal page calls this before rendering anything, the same way the
 * admin console's pages all call `requireAdmin`. A signed-out visitor is sent
 * to sign in, carrying `next` so they land back in the portal afterwards. A
 * signed-in visitor without Pro is sent to the upgrade page rather than shown
 * an empty console — there is nothing in here for them yet.
 *
 * `isGuest` is read from the session only to decide what to *show* (the
 * Guests station hides itself for a guest); it is never the reason access is
 * granted or refused — that is `isPro` alone, exactly as the public map's own
 * entitlement check works. A guest's session carries `isPro: true` once
 * accepted, set the same way a comped account's is (see `PortalGuest`).
 */
export async function requirePortalUser(
  locale: string,
  next = "/portal",
): Promise<PortalUser> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(
      `/${locale}/login?next=${encodeURIComponent(`/${locale}${next}`)}`,
    );
  }

  if (!session.user.isPro) {
    redirect(`/${locale}/pro`);
  }

  return {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? "",
    isGuest: Boolean(session.user.isGuest),
  };
}
