import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments";
import { failOrder, fulfilOrder } from "@/lib/payments/fulfil";

/**
 * Where the gateway reports payment outcomes.
 *
 * This is the authoritative fulfilment path, not the page the customer lands
 * on. A customer can close the tab before being redirected back, and the
 * payment still happened — access must not depend on their browser completing
 * a journey.
 *
 * The provider adapter verifies the payload's authenticity. Anyone can POST
 * here, so an unverified body is treated as noise rather than as a payment.
 */
export async function POST(request: Request) {
  const provider = getPaymentProvider();

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    // Several gateways post form-encoded rather than JSON; the adapter can
    // still work from the query string and headers.
  }

  const url = new URL(request.url);
  const result = await provider.verifyCallback({
    body,
    searchParams: url.searchParams,
    headers: request.headers,
  });

  if (!result) {
    // Unverifiable: refuse it, and do not record a failure against any order.
    return new NextResponse("Invalid callback", { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { providerRef: result.providerRef },
    select: { id: true },
  });

  if (!order) return new NextResponse("Unknown order", { status: 404 });

  if (result.paid) {
    await fulfilOrder(order.id);
  } else {
    await failOrder(order.id);
  }

  /*
   * 200 even for a payment that failed: the acknowledgement tells the gateway
   * the *notification* was received. Anything else and it retries a message we
   * have already correctly processed.
   */
  return NextResponse.json({ received: true });
}
