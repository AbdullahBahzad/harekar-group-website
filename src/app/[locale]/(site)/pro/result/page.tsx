import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import RefreshSession from "@/components/RefreshSession";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pro" });
  return { title: t("result.title"), robots: { index: false, follow: false } };
}

export default async function PaymentResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { locale } = await params;
  const { order: orderId } = await searchParams;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const t = await getTranslations({ locale, namespace: "pro" });

  /*
   * Scoped to the signed-in user, not just the id in the query string. Order
   * ids travel in URLs that end up in history and referrers, and an unscoped
   * lookup would let anyone holding one read someone else's purchase.
   */
  const order = orderId
    ? await prisma.order.findFirst({
        where: { id: orderId, userId: session.user.id },
      })
    : null;

  const paid = order?.status === "PAID";

  return (
    <section className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center px-6 py-28">
      {/* Purchase just landed — refresh the token so Pro applies at once. */}
      {paid && <RefreshSession />}
      <h1 className="font-display text-bone text-3xl leading-tight font-light sm:text-4xl">
        {paid ? t("result.successTitle") : t("result.pendingTitle")}
      </h1>
      <p className="text-bone/60 mt-5 text-base leading-relaxed text-pretty">
        {paid ? t("result.successBody") : t("result.pendingBody")}
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href={paid ? "/intelligence" : "/pro"}
          className="bg-gold text-ink hover:bg-gold-bright rounded-full px-6 py-2.5 text-sm font-medium transition-colors"
        >
          {paid ? t("goToIntelligence") : t("result.tryAgain")}
        </Link>
        <Link
          href="/account"
          className="border-bone/20 text-bone/70 hover:text-bone rounded-full border px-6 py-2.5 text-sm transition-colors"
        >
          {t("result.viewAccount")}
        </Link>
      </div>
    </section>
  );
}
