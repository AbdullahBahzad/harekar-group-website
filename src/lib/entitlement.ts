/**
 * What it means to have Pro.
 *
 * Two independent sources grant it, and keeping the rule in one function is
 * what stops them drifting apart:
 *
 *  - `isPro` is a permanent manual grant (comped accounts, staff, the client's
 *    own team). It never expires and is not tied to a payment.
 *  - `proUntil` is purchased access with an expiry.
 *
 * They are separate columns rather than one, because collapsing them would
 * mean either that revoking a refunded payment also strips a comped account,
 * or that a comped account needs a fake far-future expiry date.
 */
export type Entitlement = {
  isPro: boolean;
  proUntil: Date | null;
};

/** Whether the account may read gated material right now. */
export function hasProAccess(user: Entitlement, now = new Date()): boolean {
  if (user.isPro) return true;
  return user.proUntil !== null && user.proUntil > now;
}

/**
 * Extends purchased access by a period.
 *
 * Renewing before expiry stacks onto the remaining time rather than resetting
 * it — a customer who renews early must not lose the days they already paid
 * for. Renewing after expiry starts from now, since the lapsed days are gone.
 */
export function extendProUntil(
  current: Date | null,
  periodDays: number,
  now = new Date(),
): Date {
  const base = current && current > now ? current : now;
  const extended = new Date(base);
  extended.setUTCDate(extended.getUTCDate() + periodDays);
  return extended;
}
