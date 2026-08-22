/**
 * Resolves a caller-supplied redirect target to something safe to follow.
 *
 * `next` arrives from a query string, so it is attacker-controlled: a phishing
 * link can point at `/en/login?next=https://evil.example`, and an application
 * that follows it has lent its own domain to the attack.
 *
 * Only same-origin paths are honoured. Checking for a leading slash alone is
 * not enough — `//evil.example` is a protocol-relative URL that browsers treat
 * as absolute — so that form and anything carrying a scheme are both rejected,
 * and the caller's fallback is used instead.
 *
 * Backslashes are rejected outright, anywhere in the value. `/\evil.example`
 * satisfies every rule above — it starts with a single slash, has no second
 * slash, carries no colon — and browsers still normalise the backslash to a
 * slash and follow it off-site. A genuine internal path has no use for the
 * character, so there is nothing to weigh against refusing it.
 *
 * Control characters go the same way: a newline in a value that reaches a
 * `Location` header is how a redirect becomes header injection.
 */
export function safeInternalPath(
  next: string | undefined | null,
  fallback: string,
): string {
  if (!next) return fallback;

  const value = next.trim();
  const isInternal =
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes(":") &&
    !value.includes("\\") &&
    !/[\x00-\x1f\x7f]/.test(value);

  return isInternal ? value : fallback;
}
