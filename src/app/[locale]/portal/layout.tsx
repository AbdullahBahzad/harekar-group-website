import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePortalUser } from "@/lib/portal/entitlement";
import PortalRail from "@/components/portal/PortalRail";
import { signOutOfPortal } from "./actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "portal.nav" });
  return {
    title: t("brand"),
    // A signed-in client surface must never reach an index, same rule as
    // the admin console and the account page.
    robots: { index: false, follow: false, nocache: true },
  };
}

/**
 * The client portal's shell.
 *
 * Outside the `(site)` route group on purpose, the same way `admin` is: this
 * is an authenticated instrument, not a marketing page, and must not inherit
 * `SiteHeader`/`SiteFooter`. Unlike `admin`, it needs no message re-provide —
 * the root locale layout already hands every non-`admin` namespace to every
 * route, and `portal` lives at the top level of the catalogue precisely so
 * this layout can stay this simple.
 */
export default async function PortalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await requirePortalUser(locale);

  return (
    // `IraqMap`, reused as-is on the Daily Brief, reads `useSession()` for its
    // own Pro-upsell logic and needs this provider the same way `(site)`'s
    // layout already supplies it — without it, every portal page embedding
    // the map would crash rather than just fail to know who is looking.
    <SessionProvider>
      <div className="bg-ink text-bone min-h-svh md:flex">
        <PortalRail
          name={user.name ?? user.email}
          hideGuests={user.isGuest}
          locale={locale}
          signOutAction={signOutOfPortal}
        />

        <div className="min-w-0 flex-1">
          <main className="px-5 py-6 md:px-10 md:py-10">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
