"use server";

import { redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAppOrigin } from "@/lib/app-url";
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

  /*
   * Resolved before the order is written, not after.
   *
   * Both of these refuse on a misconfigured deployment, and a refusal that
   * arrives after the insert leaves a PENDING order for a checkout that never
   * started — a row that has to be reconciled by hand later to establish it was
   * never a payment at all.
   */
  const origin = await getAppOrigin();

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
   * Gateways need an absolute return URL. The origin comes from configuration
   * rather than from the request that happens to be in hand — see the note in
   * `getAppOrigin` on why the `Host` header cannot be the source of a URL a
   * paying customer will be sent to.
   */
  const returnUrl = `${origin}/${locale}/pro/result?order=${order.id}`;

  /*
   * A gateway that refuses to open a checkout leaves a row saying a purchase
   * was begun, which is not true — nobody was ever shown a payment page. Marked
   * CANCELLED rather than deleted, because "this was attempted and did not
   * start" is worth more when reconciling than a gap in the sequence. The error
   * is rethrown: the customer still needs to be told.
   */
  let redirectUrl: string;
  let providerRef: string | undefined;
  try {
    ({ redirectUrl, providerRef } = await provider.createCheckout({
      order,
      returnUrl,
    }));
  } catch (error) {
    await prisma.order
      .updateMany({
        where: { id: order.id, status: "PENDING" },
        data: { status: "CANCELLED" },
      })
      .catch(() => {
        /* The original failure is the one worth reporting. */
      });
    throw error;
  }

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
