import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments";
import { failOrder, fulfilOrder } from "@/lib/payments/fulfil";

export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled" | "expired";

/** Gateway lookups per order, at most this often, however fast the page polls. */
const CHECK_GAP_MS = 5000;
const lastChecked = new Map<string, number>();

/**
 * What the payment page polls while the customer pays in their bank app.
 *
 * Answers from the order row. While it is still pending, it also asks the
 * gateway — a callback that is late, or never arrives, must not leave
 * someone who has paid staring at a QR code.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const { orderId } = await params;
  // Scoped to the signed-in customer: an order id alone reveals nothing.
  let order = await prisma.order.findFirst({ where: { id: orderId, userId: session.user.id } });
  if (!order) return NextResponse.json({ error: "not-found" }, { status: 404 });

  if (order.status === "PENDING" && Date.now() - (lastChecked.get(order.id) ?? 0) > CHECK_GAP_MS) {
    lastChecked.set(order.id, Date.now());
    try {
      const provider = getPaymentProvider();
      if (provider.id === order.provider && provider.checkStatus) {
        const outcome = await provider.checkStatus(order);
        if (outcome === "paid") await fulfilOrder(order.id);
        if (outcome === "declined") await failOrder(order.id);
        if (outcome !== "pending") {
          order = (await prisma.order.findUnique({ where: { id: order.id } }))!;
        }
      }
    } catch (error) {
      // The order row still answers; the next poll asks the gateway again.
      console.error("Payment status check failed", error);
    }
  }

  const status: PaymentStatus =
    order.status === "PAID"
      ? "paid"
      : order.status === "FAILED"
        ? "failed"
        : order.status === "CANCELLED"
          ? "cancelled"
          : order.expiresAt && order.expiresAt.getTime() < Date.now()
            ? "expired"
            : "pending";

  if (status !== "pending") lastChecked.delete(order.id);
  return NextResponse.json({ status }, { headers: { "Cache-Control": "no-store" } });
}
