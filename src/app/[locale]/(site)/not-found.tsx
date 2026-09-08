import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * The public site's 404, rendered inside the site chrome.
 *
 * Catches `notFound()` from any page in the group — an intelligence report id
 * that does not resolve, a stale link from search. Unmatched URLs that never
 * reach a locale segment are handled by the root `not-found.tsx` instead.
 */
export default async function SiteNotFound() {
  // The whole namespace, not `error.notFound` — the "return home" label is
  // shared with the error boundary and lives one level up.
  const t = await getTranslations("error");

  return (
    <section className="mx-auto flex min-h-[60svh] max-w-3xl flex-col justify-center px-6 py-24 sm:px-10">
      <p className="text-gold/60 font-mono text-xs tracking-[0.4em]">
        {t("notFound.eyebrow")}
      </p>
      <h1 className="font-display text-bone mt-5 text-4xl font-light sm:text-5xl">
        {t("notFound.title")}
      </h1>
      <p className="text-bone/58 mt-5 max-w-xl text-sm leading-relaxed">
        {t("notFound.body")}
      </p>

      <Link
        href="/"
        className="bg-gold text-ink hover:bg-gold-bright mt-10 flex min-h-11 w-fit items-center rounded-full px-7 text-sm font-medium transition-colors"
      >
        {t("home")}
      </Link>
    </section>
  );
}
