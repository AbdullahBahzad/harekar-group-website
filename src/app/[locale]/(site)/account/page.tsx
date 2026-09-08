import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth, signOut } from "@/auth";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return {
    title: t("title"),
    // Never index a signed-in surface.
    robots: { index: false, follow: false },
  };
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  /*
   * The gate. Checked here in the server component rather than in the proxy:
   * `src/proxy.ts` exists only to hand routing to next-intl, and putting an
   * auth check in front of that would mean a second router deciding who gets
   * in, for the sake of a check that belongs on the page anyway.
   */
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);

  const t = await getTranslations({ locale, namespace: "account" });
  const { name, email, isPro } = session.user;

  return (
    <section className="mx-auto min-h-svh max-w-3xl px-6 py-28">
      <p className="text-gold/88 text-xs font-semibold tracking-[0.3em] uppercase">
        {t("eyebrow")}
      </p>
      <h1 className="font-display text-bone mt-6 text-4xl leading-tight font-light sm:text-5xl">
        {t("greeting", { name: name ?? email ?? "" })}
      </h1>

      <div className="border-bone/14 bg-surface/20 mt-12 rounded-3xl border p-6 sm:p-8">
        <dl className="space-y-6">
          <div>
            <dt className="text-bone/55 text-xs tracking-[0.2em] uppercase">
              {t("emailLabel")}
            </dt>
            <dd className="text-bone mt-2 text-base">{email}</dd>
          </div>

          <div>
            <dt className="text-bone/55 text-xs tracking-[0.2em] uppercase">
              {t("planLabel")}
            </dt>
            <dd className="mt-2 flex flex-wrap items-center gap-3">
              <span
                className={
                  isPro
                    ? "border-gold/50 text-gold inline-block rounded-full border px-3 py-1 text-xs tracking-[0.2em] uppercase"
                    : "border-bone/26 text-bone/70 inline-block rounded-full border px-3 py-1 text-xs tracking-[0.2em] uppercase"
                }
              >
                {isPro ? t("planPro") : t("planFree")}
              </span>
              {!isPro && (
                <Link
                  href="/pro"
                  className="text-gold hover:text-gold-bright text-sm underline underline-offset-4 transition-colors"
                >
                  {t("upgrade")}
                </Link>
              )}
            </dd>
          </div>
        </dl>

        <p className="text-bone/58 mt-8 text-sm leading-relaxed">
          {isPro ? t("proBlurb") : t("freeBlurb")}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/intelligence"
            className="bg-gold text-ink hover:bg-gold-bright rounded-full px-6 py-2.5 text-sm font-medium transition-colors"
          >
            {t("goToIntelligence")}
          </Link>

          {/*
           * Sign-out is a POST via a form, not a link. A GET that destroys the
           * session can be triggered by any image tag or prefetch pointing at
           * it, which logs people out unintentionally.
           */}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: `/${locale}` });
            }}
          >
            <button
              type="submit"
              className="border-bone/26 text-bone/70 hover:text-bone cursor-pointer rounded-full border px-6 py-2.5 text-sm transition-colors"
            >
              {t("signOut")}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
