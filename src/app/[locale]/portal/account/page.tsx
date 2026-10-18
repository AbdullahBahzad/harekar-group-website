import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePortalUser } from "@/lib/portal/entitlement";
import { Link } from "@/i18n/navigation";
import { signOutOfPortal } from "../actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "portal.account" });
  return { title: t("title") };
}

/**
 * The portal's own account settings — the same information `/account`
 * shows, kept inside the portal chrome so a client never has to leave it for
 * something this ordinary. `/account` itself is untouched: it predates the
 * portal and is still the page a signed-in visitor without Pro lands on.
 */
export default async function PortalAccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePortalUser(locale, "/portal/account");
  const t = await getTranslations({ locale, namespace: "portal.account" });

  return (
    <div className="max-w-xl">
      <header className="mb-6">
        <h1 className="font-display text-bone text-3xl font-light">
          {t("title")}
        </h1>
        <p className="text-bone/55 mt-2 text-sm leading-relaxed">
          {t("intro")}
        </p>
      </header>

      <div className="border-bone/14 bg-surface/20 rounded-3xl border p-6 sm:p-8">
        <dl className="space-y-6">
          <div>
            <dt className="text-bone/55 text-xs tracking-[0.2em] uppercase">
              {t("emailLabel")}
            </dt>
            <dd className="text-bone mt-2 text-base">{user.email}</dd>
          </div>

          <div>
            <dt className="text-bone/55 text-xs tracking-[0.2em] uppercase">
              {t("planLabel")}
            </dt>
            <dd className="mt-2">
              <span className="border-gold/50 text-gold inline-block rounded-full border px-3 py-1 text-xs tracking-[0.2em] uppercase">
                {user.isGuest ? t("planGuest") : t("planPro")}
              </span>
            </dd>
          </div>
        </dl>

        {!user.isGuest && (
          <p className="text-bone/58 mt-8 text-sm leading-relaxed">
            {t.rich("guestsHint", {
              link: (chunks) => (
                <Link
                  href="/portal/guests"
                  className="text-gold hover:text-gold-bright underline underline-offset-4"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        )}

        <form action={signOutOfPortal} className="mt-8">
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="border-bone/26 text-bone/70 hover:text-bone cursor-pointer rounded-full border px-6 py-2.5 text-sm transition-colors"
          >
            {t("signOut")}
          </button>
        </form>
      </div>
    </div>
  );
}
