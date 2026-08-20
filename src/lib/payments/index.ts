import { stubProvider } from "./stub";
import type { PaymentProvider } from "./types";

export type { PaymentProvider } from "./types";

/**
 * The active gateway, chosen by `PAYMENT_PROVIDER`.
 *
 * Registering providers in a map rather than branching at each call site means
 * adding FIB or ZainCash later is one import and one entry here — nothing in
 * the checkout flow itself changes.
 */
const providers: Record<string, PaymentProvider> = {
  stub: stubProvider,
};

export function getPaymentProvider(): PaymentProvider {
  const id = process.env.PAYMENT_PROVIDER ?? "stub";
  const provider = providers[id];

  if (!provider) {
    throw new Error(
      `Unknown PAYMENT_PROVIDER "${id}". Known providers: ${Object.keys(providers).join(", ")}.`,
    );
  }

  return provider;
}
