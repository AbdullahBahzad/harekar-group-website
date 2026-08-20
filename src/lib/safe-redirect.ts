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
 */
export function safeInternalPath(
  next: string | undefined | null,
  fallback: string,
): string {
  if (!next) return fallback;

  const value = next.trim();
  const isInternal =
    value.startsWith("/") && !value.startsWith("//") && !value.includes(":");

  return isInternal ? value : fallback;
}
