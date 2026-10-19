import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AuthShell from "../AuthShell";
import VerifyForm from "./VerifyForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.verify" });
  return { title: t("title"), robots: { index: false } };
}

/**
 * "Check your email": where a new account (or an unconfirmed one trying to
 * sign in) types the 6-digit code that was mailed to it.
 */
export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const { locale } = await params;
  const { email, next } = await searchParams;
  setRequestLocale(locale);
  if (!email) redirect(`/${locale}/register`);

  const t = await getTranslations({ locale, namespace: "auth.verify" });

  return (
    <AuthShell title={t("title")} subtitle={t("subtitle", { email })}>
      <VerifyForm email={email.trim().toLowerCase()} next={next} />
    </AuthShell>
  );
}
