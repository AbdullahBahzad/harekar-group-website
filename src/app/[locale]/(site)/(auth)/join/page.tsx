import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getOpenInviteByToken } from "@/lib/portal/guests";
import { Link } from "@/i18n/navigation";
import AuthShell from "../AuthShell";
import JoinForm from "./JoinForm";
import { linkExistingAccount } from "./actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.join" });
  return { title: t("title") };
}

/**
 * Where a guest invite email lands — see `PortalGuest` and
 * `portal/guests/actions.ts`.
 *
 * Branches on whether the invited address already has an account: a brand
 * new address gets the name/password form in `JoinForm`; an address that
 * already signs in somewhere just gets Pro linked to that account, with its
 * existing password left alone.
 */
export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "auth.join" });

  const invite = token ? await getOpenInviteByToken(token) : null;

  if (!invite) {
    return (
      <AuthShell title={t("title")} subtitle={t("invalidSubtitle")}>
        <Link
          href="/login"
          className="text-gold-deep hover:text-bone text-sm underline underline-offset-4"
        >
          {t("goToLogin")}
        </Link>
      </AuthShell>
    );
  }

  const existingAccount = await prisma.user.findUnique({
    where: { email: invite.email },
    select: { id: true },
  });

  return (
    <AuthShell
      title={t("title")}
      subtitle={t("subtitle", { owner: invite.owner.name ?? invite.owner.email })}
    >
      {existingAccount ? (
        <form action={linkExistingAccount} className="space-y-5">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="locale" value={locale} />
          <p className="text-bone/70 text-sm leading-relaxed">
            {t("existingAccountBody", { email: invite.email })}
          </p>
          <button
            type="submit"
            className="bg-gold text-ink hover:bg-gold-bright min-h-12 w-full cursor-pointer rounded-xl text-sm font-medium transition-colors"
          >
            {t("existingAccountSubmit")}
          </button>
        </form>
      ) : (
        <JoinForm token={token!} email={invite.email} />
      )}
    </AuthShell>
  );
}
