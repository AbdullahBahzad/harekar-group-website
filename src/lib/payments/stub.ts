import type { PaymentProvider } from "./types";

/**
 * Refuses to run outside development.
 *
 * Every entry point calls this, not just the one that starts a checkout.
 * Guarding `createCheckout` alone was not enough: `verifyCallback` is the more
 * dangerous of the two, because it is reachable from the open internet at
 * `/api/payments/callback` without any prior journey through this application.
 * A guard on the door nobody uses is not a guard.
 */
function refuseInProduction(entryPoint: string): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `The stub payment provider cannot be used in production (${entryPoint}). ` +
        "Set PAYMENT_PROVIDER to a real gateway.",
    );
  }
}

/**
 * Stands in until a gateway is signed.
 *
 * Instead of contacting anything, it sends the customer to an internal page
 * that imitates the provider's confirmation screen. That keeps the entire
 * journey — order created, customer redirected, outcome recorded, access
 * granted — exercisable end to end today, so when the real adapter arrives the
 * only untested code is the adapter itself.
 *
 * It refuses to run in production: shipping a payment provider that grants
 * access without taking money is the single worst thing in this file.
 */
export const stubProvider: PaymentProvider = {
  id: "stub",

  async createCheckout({ order }) {
    refuseInProduction("createCheckout");

    return {
      // Locale-free internal route; the page redirects onward after confirming.
      redirectUrl: `/api/payments/stub/${order.id}`,
      providerRef: `stub_${order.id}`,
    };
  },

  /**
   * Authenticates nothing, deliberately and unavoidably.
   *
   * There is no shared secret to check a signature against, because there is
   * no gateway — so `?ref=…&status=paid` from anyone at all reads here as a
   * successful payment. That is acceptable on a developer machine and is a
   * free-Pro endpoint anywhere else, which is why the production guard runs
   * before the query string is even looked at.
   */
  async verifyCallback({ searchParams }) {
    refuseInProduction("verifyCallback");

    const providerRef = searchParams.get("ref");
    if (!providerRef) return null;
    return { providerRef, paid: searchParams.get("status") === "paid" };
  },
};
