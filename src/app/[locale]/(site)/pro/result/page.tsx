import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { formatAmount } from "@/data/plans";
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
        include: { user: { select: { proUntil: true } } },
      })
    : null;

  // A payment still open goes back to its page rather than reading "failed".
  if (order?.status === "PENDING" && order.payCode) {
    redirect(`/${locale}/pro/pay/${order.id}`);
  }

  const state =
    order?.status === "PAID"
      ? "success"
      : order?.status === "FAILED"
        ? "failed"
        : order?.status === "CANCELLED"
          ? "cancelled"
          : "pending";
  const paid = state === "success";

  const date = (value: Date) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(value);

  return (
    <section className="mx-auto flex min-h-[80svh] max-w-xl flex-col justify-center px-6 py-20">
      {/* Purchase just landed — refresh the token so Pro applies at once. */}
      {paid && <RefreshSession />}

      <span
        className={`flex size-16 items-center justify-center rounded-full text-white ${
          paid ? "bg-status-clear" : state === "pending" ? "bg-status-elevated" : "bg-status-critical"
        }`}
      >
        <svg viewBox="0 0 24 24" className="size-8" aria-hidden="true">
          {paid ? (
            <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          ) : state === "pending" ? (
            <path d="M12 7v6M12 16.5v.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          ) : (
            <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          )}
        </svg>
      </span>

      <h1 className="font-display text-bone mt-8 text-3xl leading-tight font-bold sm:text-4xl">
        {t(`result.${state}Title`)}
      </h1>
      <p className="text-bone/70 mt-4 text-base leading-relaxed text-pretty">
        {t(`result.${state}Body`)}
      </p>

      {order && (
        <dl className="border-bone/12 bg-surface mt-8 divide-y divide-[color-mix(in_oklab,var(--color-bone)_10%,transparent)] rounded-2xl border px-6 text-sm">
          <ReceiptRow
            label={t("result.plan")}
            value={t.has(`plans.${order.plan}.name`) ? t(`plans.${order.plan}.name`) : order.plan}
          />
          <ReceiptRow
            label={t("result.amount")}
            value={formatAmount(order.amountMinor, order.currency, locale)}
          />
          <ReceiptRow label={t("result.method")} value={t("pay.methodFib")} />
          {order.paidAt && <ReceiptRow label={t("result.paidOn")} value={date(order.paidAt)} />}
          {paid && order.user.proUntil && (
            <ReceiptRow
              label={t("result.activeUntil")}
              value={<span className="text-status-clear font-semibold">{date(order.user.proUntil)}</span>}
            />
          )}
          <ReceiptRow
            label={t("result.reference")}
            value={<span dir="ltr" className="font-mono">{order.id.slice(-8).toUpperCase()}</span>}
          />
        </dl>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={paid ? "/intelligence" : "/pro"}
          className="bg-gold text-ink hover:bg-gold-bright rounded-full px-6 py-2.5 text-sm font-medium transition-colors"
        >
          {paid ? t("goToIntelligence") : t("result.tryAgain")}
        </Link>
        <Link
          href="/account"
          className="border-bone/26 text-bone/70 hover:text-bone rounded-full border px-6 py-2.5 text-sm transition-colors"
        >
          {t("result.viewAccount")}
        </Link>
      </div>
    </section>
  );
}

function ReceiptRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <dt className="text-bone/55">{label}</dt>
      <dd className="text-bone text-end font-medium">{value}</dd>
    </div>
  );
}
