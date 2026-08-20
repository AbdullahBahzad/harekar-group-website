import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fulfilOrder } from "@/lib/payments/fulfil";

/**
 * Stands in for the gateway's hosted payment page.
 *
 * Marks the order paid and bounces the customer to the result page, imitating
 * what a real provider does after a successful card charge. It exists so the
 * whole upgrade journey can be walked today, before a provider is signed.
 *
 * Hard-disabled outside development. This endpoint grants paid access for
 * free, so reachability in production would be a straightforward way to steal
 * the product.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const { orderId } = await params;
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) return new NextResponse("Unknown order", { status: 404 });

  await fulfilOrder(orderId);

  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/en/pro/result?order=${orderId}`);
}
