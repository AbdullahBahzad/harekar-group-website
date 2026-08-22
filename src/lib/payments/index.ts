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
  const configured = process.env.PAYMENT_PROVIDER;

  /*
   * There is no default in production.
   *
   * Falling back to the stub when the variable is missing meant one forgotten
   * line of deployment configuration silently turned the callback endpoint
   * into a way to grant Pro for free — and silently, because a stub that works
   * looks exactly like a gateway that works until the money is counted. A
   * missing setting has to stop the request, not pick something for us.
   */
  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "PAYMENT_PROVIDER is not set. Set it to a real gateway — there is no default in production.",
      );
    }
    return stubProvider;
  }

  const provider = providers[configured];

  if (!provider) {
    throw new Error(
      `Unknown PAYMENT_PROVIDER "${configured}". Known providers: ${Object.keys(providers).join(", ")}.`,
    );
  }

  return provider;
}
