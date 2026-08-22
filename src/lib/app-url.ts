import { headers } from "next/headers";

/**
 * The site's own absolute origin, for building URLs that leave the building.
 *
 * Deriving this from the request's `Host` header is the obvious approach and is
 * wrong: that header is supplied by the caller, so a request carrying
 * `Host: evil.example` produces absolute URLs pointing at `evil.example`. For a
 * payment return URL that is not a cosmetic problem — it is the gateway sending
 * a paying customer to an attacker's page at the exact moment they expect to be
 * asked for card details.
 *
 * So in production the origin comes from configuration and nowhere else, and a
 * missing setting stops the request rather than falling back to the header the
 * attacker controls. Locally there is nothing to configure and no attacker
 * worth the name, so the request is trusted — including `x-forwarded-proto`,
 * because a dev tunnel terminates TLS in front of the server and that header is
 * the only thing that knows.
 */
export async function getAppOrigin(): Promise<string> {
  const configured = process.env.APP_URL?.trim();

  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      throw new Error(`APP_URL is not a valid URL: "${configured}"`);
    }
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "APP_URL is not set. Set it to the site's public origin (for example " +
        "https://harekar.com) — the Host header cannot be trusted to build " +
        "absolute URLs.",
    );
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";

  // Proxies append rather than replace, so the first value is the client's.
  const forwarded = requestHeaders.get("x-forwarded-proto")?.split(",")[0];
  const protocol = forwarded?.trim() || "http";

  return `${protocol}://${host}`;
}
