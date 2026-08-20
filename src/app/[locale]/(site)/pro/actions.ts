"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { hasLocale } from "next-intl";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { findPlan } from "@/data/plans";
import { getPaymentProvider } from "@/lib/payments";
import { locales } from "@/i18n/routing";

/**
 * Starts a purchase.
 *
 * The price is read from the server's own plan table using only the plan id
 * from the form. Nothing about the amount comes from the client — a form field
 * carrying the price is a form field the customer can edit.
 */
export async function startCheckout(formData: FormData): Promise<void> {
  const session = await auth();
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = hasLocale(locales, rawLocale) ? rawLocale : "en";

  // Buying requires an account to attach the entitlement to.
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const plan = findPlan(String(formData.get("plan") ?? ""));
  if (!plan) redirect(`/${locale}/pro?error=plan`);

  const provider = getPaymentProvider();

  const order = await prisma.order.create({
    data: {
      userId: session.user.id,
      plan: plan.id,
      amountMinor: plan.amountMinor,
      currency: plan.currency,
      periodDays: plan.periodDays,
      provider: provider.id,
    },
  });

  /*
   * Gateways need an absolute return URL, and the correct host is whatever the
   * request actually arrived on — deriving it from the request rather than a
   * hardcoded constant keeps preview deployments and local development working
   * without per-environment configuration.
   */
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const returnUrl = `${protocol}://${host}/${locale}/pro/result?order=${order.id}`;

  const { redirectUrl, providerRef } = await provider.createCheckout({
    order,
    returnUrl,
  });

  if (providerRef) {
    await prisma.order.update({
      where: { id: order.id },
      data: { providerRef },
    });
  }

  // Outside try/catch: `redirect` signals by throwing, and catching it here
  // would strand the customer on the pricing page after an order was created.
  redirect(redirectUrl);
}
