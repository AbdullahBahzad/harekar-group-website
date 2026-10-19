import type { Order } from "@prisma/client";
import type { PaymentProvider } from "./types";

/**
 * First Iraqi Bank — online payments.
 *
 * Written from FIB's public merchant API; check every path and field against
 * the documentation FIB sends with the merchant account, and run it on their
 * staging environment before switching production over.
 *
 * Configuration (server `.env` only — the secret never reaches a browser):
 *   PAYMENT_PROVIDER=fib
 *   FIB_BASE_URL=https://fib.stage.fib.iq   (production: https://fib.prod.fib.iq)
 *   FIB_CLIENT_ID=…
 *   FIB_CLIENT_SECRET=…
 *
 * The flow: the site registers a payment and gets back a QR code, a short
 * code and app links; the customer pays inside the FIB app; FIB calls
 * `statusCallbackUrl`. That callback is not trusted as it arrives — anyone can
 * post `{ status: "PAID" }` — so it is only used as a prompt to ask FIB
 * itself, with our credentials, how the payment stands.
 */

/** How long a payment code stays payable. */
export const PAY_CODE_MINUTES = 15;

function config() {
  const baseUrl = process.env.FIB_BASE_URL?.trim().replace(/\/+$/, "");
  const clientId = process.env.FIB_CLIENT_ID?.trim();
  const clientSecret = process.env.FIB_CLIENT_SECRET?.trim();
  if (!baseUrl || !clientId || !clientSecret) {
    throw new Error(
      "FIB is not configured: set FIB_BASE_URL, FIB_CLIENT_ID and FIB_CLIENT_SECRET.",
    );
  }
  return { baseUrl, clientId, clientSecret };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

/** OAuth client-credentials token, reused until shortly before it expires. */
async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;
  const { baseUrl, clientId, clientSecret } = config();
  const response = await fetch(
    `${baseUrl}/auth/realms/fib-online-shop/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error(`FIB token request failed (${response.status})`);
  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function fibFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { baseUrl } = config();
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
}

/** "250.00" for USD, "325000" for IQD — FIB takes the amount as a string. */
function amountString(order: Order): string {
  return order.currency === "IQD"
    ? String(order.amountMinor)
    : (order.amountMinor / 100).toFixed(2);
}

/** FIB payment ids are UUIDs; anything else is not one of ours. */
const PAYMENT_ID = /^[0-9a-f-]{36}$/i;

async function fetchStatus(paymentId: string): Promise<"PAID" | "UNPAID" | "DECLINED"> {
  const response = await fibFetch(`/protected/v1/payments/${paymentId}/status`);
  if (!response.ok) throw new Error(`FIB status request failed (${response.status})`);
  const data = (await response.json()) as { status: "PAID" | "UNPAID" | "DECLINED" };
  return data.status;
}

export const fibProvider: PaymentProvider = {
  id: "fib",

  async createCheckout({ order, returnUrl }) {
    const origin = new URL(returnUrl).origin;
    const response = await fibFetch("/protected/v1/payments", {
      method: "POST",
      body: JSON.stringify({
        monetaryValue: { amount: amountString(order), currency: order.currency },
        statusCallbackUrl: `${origin}/api/payments/callback`,
        description: `Harekar Pro (${order.plan})`,
        expiresIn: `PT${PAY_CODE_MINUTES}M`,
      }),
    });
    if (!response.ok) throw new Error(`FIB payment request failed (${response.status})`);
    const data = (await response.json()) as {
      paymentId: string;
      readableCode: string;
      qrCode: string;
      validUntil: string;
      personalAppLink?: string;
    };
    return {
      kind: "inApp",
      providerRef: data.paymentId,
      readableCode: data.readableCode,
      qrCode: data.qrCode,
      appLink: data.personalAppLink,
      expiresAt: new Date(data.validUntil),
    };
  },

  async verifyCallback({ body }) {
    const id = (body as { id?: unknown } | null)?.id;
    if (typeof id !== "string" || !PAYMENT_ID.test(id)) return null;
    // The body only says which payment to look at; FIB says how it stands.
    const status = await fetchStatus(id);
    if (status === "UNPAID") return null;
    return { providerRef: id, paid: status === "PAID" };
  },

  async checkStatus(order) {
    if (!order.providerRef) return "pending";
    const status = await fetchStatus(order.providerRef);
    return status === "PAID" ? "paid" : status === "DECLINED" ? "declined" : "pending";
  },

  async cancel(order) {
    if (!order.providerRef) return;
    await fibFetch(`/protected/v1/payments/${order.providerRef}/cancel`, { method: "POST" });
  },
};
