import { lookup } from "node:dns/promises";

/**
 * Fetching a URL an operator typed into a form, on the server, needs the same
 * guard wherever it happens — this used to live only in `reports.ts`, and
 * `headlines.ts` needed an identical copy. A second hand-written copy of an
 * SSRF check is exactly the kind of thing that quietly drifts out of sync, so
 * it lives here once and both import it.
 */

/**
 * Addresses that must never be reachable from a URL somebody typed into a
 * form.
 *
 * The interesting entry is 169.254.169.254: on every major cloud that is the
 * instance metadata service, and on many deployments it will hand out the
 * machine's credentials to anything that asks.
 */
function isBlockedAddress(address: string, family: number): boolean {
  if (family === 6) {
    const ip = address.toLowerCase();

    // An IPv4-mapped address (::ffff:127.0.0.1) is IPv4 wearing a v6 coat.
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
    if (mapped) return isBlockedAddress(mapped[1], 4);

    if (ip === "::" || ip === "::1") return true;
    // Unique-local fc00::/7, then link-local fe80::/10.
    return /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip);
  }

  const [a, b] = address.split(".").map(Number);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a >= 224) return true; // multicast and reserved
  return false;
}

/**
 * Resolves a URL and refuses anything pointing back inside the network.
 *
 * The hostname is *resolved* rather than pattern-matched, because
 * `http://intranet.example.com/` looks perfectly public right up until DNS
 * answers with 10.0.0.5.
 */
export async function assertFetchable(url: string): Promise<URL> {
  const parsed = new URL(url);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Refusing to fetch a ${parsed.protocol} URL`);
  }

  const addresses = await lookup(parsed.hostname, { all: true });
  if (addresses.length === 0) {
    throw new Error(`${parsed.hostname} did not resolve`);
  }
  if (addresses.some((a) => isBlockedAddress(a.address, a.family))) {
    throw new Error(`${parsed.hostname} resolves inside the private network`);
  }

  return parsed;
}

/** How many hops to follow before giving up on a source. */
const MAX_REDIRECTS = 3;

/**
 * Fetches a URL's raw response text, following redirects by hand so every
 * hop is re-checked against `assertFetchable` — letting `fetch` follow them
 * would validate only the first address, and a public host is perfectly free
 * to answer with a 302 to 169.254.169.254.
 *
 * Never throws: a slow, unreachable, or refused source cannot be allowed to
 * hang whatever is waiting on it, so any failure resolves to `""`.
 */
export async function safeFetchText(
  url: string,
  timeoutMs = 8000,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let target = await assertFetchable(url);
    let res: Response;

    for (let hop = 0; ; hop++) {
      res = await fetch(target, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; HarekarReportBot/1.0)",
        },
      });

      const location = res.headers.get("location");
      if (res.status < 300 || res.status >= 400 || !location) break;
      if (hop >= MAX_REDIRECTS) return "";

      target = await assertFetchable(new URL(location, target).toString());
    }

    /*
     * A source refusing the request outright (403, or a redirect-shaped
     * bot challenge with no Location to follow — Sucuri does this on at
     * least one of the eleven sources) is not this module's failure to
     * recover from; it is that site declining an automated client. Logged
     * so a thin `failed` line in the console reads as "that outlet blocked
     * us" rather than a silent gap, but resolved the same as any other
     * unreachable source: empty, not thrown.
     */
    if (!res.ok) {
      console.warn(`${url} refused the request (${res.status})`);
      return "";
    }
    return await res.text();
  } catch (error) {
    console.warn(`Could not fetch ${url}`, error);
    return "";
  } finally {
    clearTimeout(timeout);
  }
}
