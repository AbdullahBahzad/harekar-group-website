import SiteLayout from "@/app/[locale]/(site)/layout";
import SiteNotFound from "@/app/[locale]/(site)/not-found";

/**
 * The 404 for everything under a locale that sits outside the public site's
 * own group — in practice, the admin console.
 *
 * The console answers "not found" to anyone who is not a signed-in operator
 * (see `lib/admin.ts`), so that its address gives nothing away. For that to
 * hold, this page has to be indistinguishable from the 404 a mistyped public
 * address gets — so it is that page: the same site header, footer and
 * message, rendered through the public layout and the public not-found.
 */
export default function LocaleNotFound() {
  return (
    <SiteLayout>
      <SiteNotFound />
    </SiteLayout>
  );
}
