import { prisma } from "@/lib/prisma";
import { extendProUntil } from "@/lib/entitlement";

/**
 * Turns a paid order into access.
 *
 * This is the only place entitlement is granted from a payment, and it is
 * written to be safe to call more than once with the same order. Gateways
 * retry callbacks, users refresh return pages, and networks duplicate
 * requests — if this were not idempotent, one payment could extend a
 * subscription two or three times.
 *
 * The guard is the status check inside the transaction: the update only
 * matches rows still `PENDING`, so a second delivery of the same callback
 * updates nothing and grants nothing.
 */
export async function fulfilOrder(orderId: string): Promise<
  | { outcome: "granted"; proUntil: Date }
  | { outcome: "already-processed" }
  | { outcome: "not-found" }
> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { proUntil: true } } },
    });

    if (!order) return { outcome: "not-found" as const };
    if (order.status === "PAID") return { outcome: "already-processed" as const };

    /*
     * Conditional update as the concurrency guard. Two callbacks arriving at
     * once both read PENDING above, but only one can satisfy this `where` —
     * the loser updates zero rows and is thrown out below.
     */
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date() },
    });

    if (claimed.count === 0) return { outcome: "already-processed" as const };

    const proUntil = extendProUntil(order.user.proUntil, order.periodDays);

    await tx.user.update({
      where: { id: order.userId },
      data: { proUntil },
    });

    return { outcome: "granted" as const, proUntil };
  });
}

/** Records an order the gateway reported as failed. */
export async function failOrder(orderId: string): Promise<void> {
  await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "FAILED" },
  });
}
