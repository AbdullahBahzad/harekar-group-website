import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/data/plans";
import FibCheckout from "@/components/payments/FibCheckout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pro.pay" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * Pay in the FIB app: QR code, app button and short code for one order,
 * waiting for the bank to confirm.
 */
export default async function PayPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale, orderId } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  // Scoped to the signed-in customer, like the result page.
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.user.id },
  });
  if (!order || !order.payCode || !order.payQr) redirect(`/${locale}/pro`);
  if (order.status === "PAID") redirect(`/${locale}/pro/result?order=${order.id}`);

  const t = await getTranslations({ locale, namespace: "pro" });
  const now = new Date();
  const expired = Boolean(order.expiresAt && order.expiresAt < now);

  return (
    <FibCheckout
      orderId={order.id}
      planId={order.plan}
      planName={t.has(`plans.${order.plan}.name`) ? t(`plans.${order.plan}.name`) : order.plan}
      period={t.has(`plans.${order.plan}.period`) ? t(`plans.${order.plan}.period`) : ""}
      amount={formatAmount(order.amountMinor, order.currency, locale)}
      code={order.payCode}
      qr={order.payQr}
      appLink={order.payAppLink}
      expiresAt={order.expiresAt?.toISOString() ?? null}
      serverNow={now.toISOString()}
      initialStatus={
        order.status === "FAILED"
          ? "failed"
          : order.status === "CANCELLED"
            ? "cancelled"
            : expired
              ? "expired"
              : "pending"
      }
      // The developer panel: only for the simulated gateway, never in production.
      simulateRef={
        order.provider === "fib-sim" && process.env.NODE_ENV !== "production"
          ? order.providerRef
          : null
      }
    />
  );
}
