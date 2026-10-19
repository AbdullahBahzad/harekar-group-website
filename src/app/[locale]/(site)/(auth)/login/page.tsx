import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { loginAccount } from "../actions";
import AuthForm from "../AuthForm";
import AuthShell from "../AuthShell";
import { safeInternalPath } from "@/lib/safe-redirect";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("signInTitle") };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; verified?: string; email?: string }>;
}) {
  const { locale } = await params;
  const { next, verified, email } = await searchParams;
  setRequestLocale(locale);

  /*
   * Already signed in: honour `next` so a signed-in operator following a
   * console link is not bounced to the customer account page instead.
   */
  const session = await auth();
  if (session?.user) {
    redirect(safeInternalPath(next, `/${locale}/account`));
  }

  const t = await getTranslations({ locale, namespace: "auth" });

  return (
    <AuthShell title={t("signInTitle")} subtitle={t("signInSubtitle")}>
      {verified === "1" && (
        <p
          role="status"
          className="border-status-clear/40 bg-status-clear/10 text-status-clear mb-5 rounded-xl border px-4 py-3 text-sm"
        >
          {t("verify.confirmed")}
        </p>
      )}
      <AuthForm mode="login" action={loginAccount} next={next} initialEmail={email} />
    </AuthShell>
  );
}
