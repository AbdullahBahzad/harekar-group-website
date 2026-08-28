import type { Order } from "@prisma/client";

/**
 * The seam every payment gateway plugs into.
 *
 * Deliberately small, and shaped around the one flow all the Iraqi gateways
 * share: create a transaction, send the customer to the provider's own page,
 * get told the outcome afterwards. It does *not* model card details, tokens or
 * recurring charges — none of the candidate providers expose those, and an
 * interface promising capabilities the implementations lack is worse than no
 * interface at all.
 */
export type PaymentProvider = {
  /** Stored on the order, so a row always records who processed it. */
  id: string;

  /**
   * Registers the payment and returns where to send the customer.
   *
   * `providerRef` is the gateway's own transaction id, persisted so an
   * asynchronous callback can be matched back to this order.
   */
  createCheckout(input: {
    order: Order;
    /** Absolute URL the gateway returns the customer to. */
    returnUrl: string;
  }): Promise<{ redirectUrl: string; providerRef?: string }>;

  /**
   * Interprets a callback from the gateway.
   *
   * Returns `null` when the payload cannot be trusted — an unverifiable
   * callback must never be treated as a failed payment, because that is
   * indistinguishable from a forged one.
   */
  verifyCallback(payload: {
    /**
     * The request body exactly as it arrived, unparsed.
     *
     * This is the field a real adapter will verify against, and it has to be
     * the raw bytes: gateways sign the body they sent, and
     * `JSON.stringify(JSON.parse(raw))` does not reproduce it. Key order,
     * whitespace, unicode escaping and number formatting all move, so an HMAC
     * recomputed from the parsed object disagrees with the signature every
     * time — and an adapter that cannot verify a signature is an adapter that
     * has to trust the caller, which is the whole thing this endpoint exists
     * to avoid.
     *
     * It is also what a form-encoded gateway needs, since those do not post
     * JSON at all.
     */
    raw: string;
    /**
     * `raw` parsed as JSON, or null when it was not JSON. A convenience for
     * reading fields *after* the signature has been checked against `raw` —
     * never a substitute for checking it.
     */
    body: unknown;
    searchParams: URLSearchParams;
    headers: Headers;
  }): Promise<{ providerRef: string; paid: boolean } | null>;
};
