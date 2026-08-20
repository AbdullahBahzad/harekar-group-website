import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { registerAccount } from "../actions";
import AuthForm from "../AuthForm";
import AuthShell from "../AuthShell";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("registerTitle") };
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (session?.user) redirect(`/${locale}/account`);

  const t = await getTranslations({ locale, namespace: "auth" });

  return (
    <AuthShell title={t("registerTitle")} subtitle={t("registerSubtitle")}>
      <AuthForm mode="register" action={registerAccount} />
    </AuthShell>
  );
}
