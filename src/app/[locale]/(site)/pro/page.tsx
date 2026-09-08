import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { formatPrice, plans } from "@/data/plans";
import { Link } from "@/i18n/navigation";
import { getSiteContent, pick } from "@/lib/site-content";
import type { Locale } from "@/i18n/routing";
import { startCheckout } from "./actions";

/** Prefixes into `SiteContent` for each plan's editable copy. */
const planFields: Record<string, string> = {
  monthly: "planMonthly",
  yearly: "planYearly",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pro" });
  return { title: t("title") };
}

export default async function ProPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "pro" });
  const session = await auth();
  const signedIn = Boolean(session?.user);
  const alreadyPro = Boolean(session?.user?.isPro);
  const content = await getSiteContent();
  const p = (field: string, fallback: string) =>
    pick(content, field, locale as Locale, fallback);

  return (
    <section className="mx-auto min-h-svh max-w-4xl px-6 py-28">
      <p className="text-gold/88 text-xs font-semibold tracking-[0.3em] uppercase">
        {p("proEyebrow", t("eyebrow"))}
      </p>
      <h1 className="font-display text-bone mt-6 max-w-2xl text-4xl leading-[1.15] font-light text-balance sm:text-5xl">
        {p("proTitle", t("title"))}
      </h1>
      <p className="text-bone/70 mt-6 max-w-xl text-base leading-relaxed text-pretty">
        {p("proSubtitle", t("subtitle"))}
      </p>

      {alreadyPro ? (
        <div className="border-gold/40 bg-surface/20 mt-12 rounded-3xl border p-8">
          <p className="text-bone text-lg">{t("alreadyPro")}</p>
          <Link
            href="/intelligence"
            className="bg-gold text-ink hover:bg-gold-bright mt-6 inline-block rounded-full px-6 py-2.5 text-sm font-medium transition-colors"
          >
            {t("goToIntelligence")}
          </Link>
        </div>
      ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-3xl border p-8 ${
                plan.featured
                  ? "border-gold/50 bg-surface/30"
                  : "border-bone/14 bg-surface/15"
              }`}
            >
              {plan.featured && (
                <span className="border-gold/50 text-gold absolute -top-3 left-8 rounded-full border bg-[var(--color-ink)] px-3 py-1 text-[10px] tracking-[0.25em] uppercase">
                  {t("bestValue")}
                </span>
              )}

              <h2 className="text-bone/70 text-xs tracking-[0.2em] uppercase">
                {p(`${planFields[plan.id]}Name`, t(`plans.${plan.id}.name`))}
              </h2>

              <p className="font-display text-bone mt-4 text-4xl font-light">
                {formatPrice(plan, locale)}
                <span className="text-bone/50 ml-2 text-base">
                  {p(
                    `${planFields[plan.id]}Period`,
                    t(`plans.${plan.id}.period`),
                  )}
                </span>
              </p>

              <p className="text-bone/65 mt-4 text-sm leading-relaxed">
                {p(
                  `${planFields[plan.id]}Blurb`,
                  t(`plans.${plan.id}.blurb`),
                )}
              </p>

              {/*
               * Signed-out visitors are sent to register rather than into a
               * checkout that would only bounce them there anyway — an order
               * has to belong to an account.
               */}
              {signedIn ? (
                <form action={startCheckout} className="mt-8">
                  <input type="hidden" name="plan" value={plan.id} />
                  <input type="hidden" name="locale" value={locale} />
                  <button
                    type="submit"
                    className={`w-full cursor-pointer rounded-full px-6 py-3 text-sm font-medium transition-colors ${
                      plan.featured
                        ? "bg-gold text-ink hover:bg-gold-bright"
                        : "border-bone/26 text-bone/80 hover:border-gold hover:text-gold border"
                    }`}
                  >
                    {t("payByCard")}
                  </button>
                </form>
              ) : (
                <Link
                  href="/register"
                  className={`mt-8 block w-full rounded-full px-6 py-3 text-center text-sm font-medium transition-colors ${
                    plan.featured
                      ? "bg-gold text-ink hover:bg-gold-bright"
                      : "border-bone/26 text-bone/80 hover:border-gold hover:text-gold border"
                  }`}
                >
                  {t("createAccountFirst")}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-bone/50 mt-10 text-xs leading-relaxed">
        {t("renewalNote")}
      </p>
    </section>
  );
}
