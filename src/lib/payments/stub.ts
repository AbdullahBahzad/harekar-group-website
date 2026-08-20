import type { PaymentProvider } from "./types";

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
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "The stub payment provider cannot be used in production. Set PAYMENT_PROVIDER to a real gateway.",
      );
    }

    return {
      // Locale-free internal route; the page redirects onward after confirming.
      redirectUrl: `/api/payments/stub/${order.id}`,
      providerRef: `stub_${order.id}`,
    };
  },

  async verifyCallback({ searchParams }) {
    const providerRef = searchParams.get("ref");
    if (!providerRef) return null;
    return { providerRef, paid: searchParams.get("status") === "paid" };
  },
};
