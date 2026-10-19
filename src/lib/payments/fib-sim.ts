import { createHash, randomBytes } from "node:crypto";
import type { PaymentProvider } from "./types";
import { PAY_CODE_MINUTES } from "./fib";

/**
 * FIB, simulated — for building and testing the payment page before the
 * merchant account exists.
 *
 * Behaves like the real adapter from the site's side: it hands back a code, a
 * QR and an app link, and the outcome arrives later on the callback endpoint
 * in FIB's shape (`{ id, status }`). The payment page shows a developer panel
 * that posts that callback, standing in for the customer paying in the app.
 *
 * Grants Pro without money, so it refuses to run in production — the same
 * guard as the stub, on every entry point.
 */
function refuseInProduction(entryPoint: string): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `The simulated FIB provider cannot be used in production (${entryPoint}). ` +
        "Set PAYMENT_PROVIDER to fib.",
    );
  }
}

/** Twelve characters in groups of four, the way FIB prints its codes. */
function readableCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const chars = [...randomBytes(12)].map((b) => alphabet[b % alphabet.length]).join("");
  return chars.match(/.{4}/g)!.join("-");
}

/**
 * A QR-looking image. Not a scannable code — there is nothing to scan it
 * with until FIB issues real ones — but the right size and texture, so the
 * page is designed around what it will actually show.
 */
function sampleQr(seed: string): string {
  const n = 29;
  const bits = createHash("sha512").update(seed).digest();
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
  const finder = (ox: number, oy: number) =>
    `<path d="M${ox} ${oy}h7v7h-7z M${ox + 1} ${oy + 1}v5h5v-5z" fill-rule="evenodd"/>` +
    `<rect x="${ox + 2}" y="${oy + 2}" width="3" height="3"/>`;
  let modules = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (inFinder(x, y)) continue;
      const i = y * n + x;
      const byte = bits[(i * 7) % bits.length] ^ bits[(i * 13 + 5) % bits.length];
      if ((byte >> (i % 8)) & 1) modules += `M${x} ${y}h1v1h-1z`;
    }
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges">` +
    `<rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/>` +
    `<g fill="#101d2f">${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}<path d="${modules}"/></g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export const fibSimProvider: PaymentProvider = {
  id: "fib-sim",

  async createCheckout({ order }) {
    refuseInProduction("createCheckout");
    const providerRef = `sim_${order.id}`;
    return {
      kind: "inApp",
      providerRef,
      readableCode: readableCode(),
      qrCode: sampleQr(providerRef),
      // Where FIB's personal-app link would point. Opens nothing here.
      appLink: `https://personal.fib.iq/payments/${providerRef}`,
      expiresAt: new Date(Date.now() + PAY_CODE_MINUTES * 60 * 1000),
    };
  },

  /** Trusts the body — acceptable only because it cannot run in production. */
  async verifyCallback({ body }) {
    refuseInProduction("verifyCallback");
    const { id, status } = (body ?? {}) as { id?: unknown; status?: unknown };
    if (typeof id !== "string") return null;
    if (status === "PAID") return { providerRef: id, paid: true };
    if (status === "DECLINED") return { providerRef: id, paid: false };
    return null;
  },

  // The outcome only ever arrives through the simulated callback.
  async checkStatus() {
    refuseInProduction("checkStatus");
    return "pending";
  },

  async cancel() {
    refuseInProduction("cancel");
  },
};
