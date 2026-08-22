import { headers } from "next/headers";

/**
 * A fixed-window rate limiter held in this process's memory.
 *
 * What it is not: durable, shared, or exact. Counters live in a `Map`, so they
 * reset when the server restarts, and a deployment running several instances
 * gives each one its own budget. A determined attacker with a botnet is not
 * stopped by this.
 *
 * What it is: the difference between a public form that can be submitted a few
 * times a minute and one that can be submitted ten thousand times a minute by a
 * single machine. That is the actual threat to a site this size — an unattended
 * script filling Postgres with spam, or grinding passwords against bcrypt at
 * twelve rounds until the CPU gives out. A Map closes that door today, with no
 * Redis to run and nothing to configure. When there is somewhere shared to keep
 * the counters, only this file needs to change.
 */
type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/** Stops the map growing without bound when keys are never seen again. */
let lastSweep = Date.now();
const SWEEP_INTERVAL_MS = 60_000;

function sweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

/**
 * Records an attempt against `key`.
 *
 * Returns false once the limit is reached, and keeps returning false until the
 * window rolls over. The attempt is counted either way — a caller that is
 * already over its budget does not get a fresh allowance by continuing to try.
 */
export function withinRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  sweep(now);

  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  existing.count += 1;
  return existing.count <= limit;
}

/**
 * Who is asking, as well as can be told.
 *
 * `x-forwarded-for` accumulates left to right as a request crosses proxies, so
 * the client's own address is the first entry. It is trivially forged when the
 * application is reachable directly — which is the honest limit of any
 * IP-based limit that is not enforced at the edge. Behind a proxy that
 * overwrites the header, it is accurate.
 */
export async function clientKey(scope: string): Promise<string> {
  const requestHeaders = await headers();

  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0];
  const address = forwarded?.trim() || requestHeaders.get("x-real-ip") || "local";

  return `${scope}:${address}`;
}
