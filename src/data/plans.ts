/**
 * What Pro costs.
 *
 * PRICING: these are placeholders — set the real figures before launch.
 *
 * Amounts are in the currency's smallest unit (fils for IQD, cents for USD)
 * and held as integers. Money is never a float: 0.1 + 0.2 is not 0.3 in
 * binary floating point, and that error compounds through totals and refunds.
 */
export type PlanId = "monthly" | "yearly";

export type Plan = {
  id: PlanId;
  /** Smallest currency unit. */
  amountMinor: number;
  currency: "USD" | "IQD";
  /** Days of Pro access this plan grants. */
  periodDays: number;
  /** Marks the plan the pricing page emphasises. */
  featured?: boolean;
};

export const plans: Plan[] = [
  {
    id: "monthly",
    amountMinor: 25000, // $250.00
    currency: "USD",
    periodDays: 30,
  },
  {
    id: "yearly",
    amountMinor: 250000, // $2,500.00 — two months free against monthly
    currency: "USD",
    periodDays: 365,
    featured: true,
  },
];

export function findPlan(id: string): Plan | undefined {
  return plans.find((plan) => plan.id === id);
}

/**
 * How many minor units make one major unit, per currency.
 *
 * Not universally 100. The Iraqi dinar is formally divided into 1000 fils, but
 * fils are long out of circulation and every payment API treats IQD as
 * zero-decimal — so an IQD amount is already a whole dinar and must not be
 * divided at all.
 */
const MINOR_UNITS: Record<Plan["currency"], number> = {
  USD: 100,
  IQD: 1,
};

/**
 * Formats a plan price for display.
 *
 * Locale-aware because the site runs in Arabic and Kurdish, where digits and
 * currency placement differ from English — a hardcoded `$250` would read wrong
 * in two of the three locales.
 */
export function formatPrice(plan: Plan, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: plan.currency,
    // These are whole-unit prices; trailing ".00" is noise on a pricing card.
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(plan.amountMinor / MINOR_UNITS[plan.currency]);
}
