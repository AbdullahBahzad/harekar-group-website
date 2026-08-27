import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getSiteContent } from "@/lib/site-content";

/**
 * The public site's chrome.
 *
 * Split out of the locale layout so the admin console does not inherit it. The
 * console previously rendered underneath the marketing navbar and footer,
 * which is not a cosmetic problem: an operations console carrying a "Request a
 * Quote" button and a language switcher reads as a page of the website rather
 * than as the instrument behind it.
 *
 * Route groups do not affect the URL, so every public path is unchanged —
 * `/en/contact` is still `/en/contact`.
 */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  /*
   * Fetched here rather than inside `SiteFooter` itself: mixing an `await`
   * with next-intl's `useTranslations`/`useLocale` in the same async
   * component crashes React ("Expected a suspended thenable") — those hooks
   * read from context via `use()`, which cannot follow an await in the same
   * function. Fetching in this plain, hook-free layout and passing the
   * result down keeps the footer's own hooks safely synchronous.
   */
  const content = await getSiteContent();

  return (
    /*
     * Session state is provided to the client rather than read on the server.
     * Calling `auth()` in a layout would mark every page beneath it dynamic,
     * undoing the static rendering `setRequestLocale` exists to enable — for
     * the sake of one link in the header.
     */
    <SessionProvider>
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter content={content} />
      </div>
    </SessionProvider>
  );
}
