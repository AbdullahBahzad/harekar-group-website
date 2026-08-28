import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider, type PaymentProvider } from "@/lib/payments";
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
  /*
   * The body is read once, as text, and handed on unparsed.
   *
   * A request body is a stream and can only be consumed once, so whichever
   * form is read first is the only one available afterwards — and the form an
   * adapter actually needs is the raw one, because that is what the gateway
   * signed. Parsing first and re-serialising to check a signature cannot work:
   * the round trip does not return the same bytes.
   *
   * The parsed value is offered alongside it purely for convenience, and only
   * when the payload was JSON at all — several Iraqi gateways post
   * form-encoded, which `raw` still carries intact.
   */
  const raw = await request.text();

  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    // Not JSON. `raw`, the query string and the headers are still available.
  }

  const url = new URL(request.url);

  /*
   * Resolving the provider and verifying are one guarded step.
   *
   * Both throw on a misconfigured deployment — an unset `PAYMENT_PROVIDER`, or
   * the stub reached in production. That has to be distinguishable from a
   * payload this endpoint simply could not verify: a 400 reads as ordinary
   * internet noise and would bury the one condition most worth noticing. 503
   * says the fault is ours, and tells the gateway to deliver this notification
   * again once it is fixed, so a real payment is not lost to a bad deploy.
   */
  let result: Awaited<ReturnType<PaymentProvider["verifyCallback"]>>;
  try {
    const provider = getPaymentProvider();
    result = await provider.verifyCallback({
      raw,
      body,
      searchParams: url.searchParams,
      headers: request.headers,
    });
  } catch (error) {
    console.error("Payment callback could not be processed", error);
    return new NextResponse("Payment provider unavailable", { status: 503 });
  }

  if (!result) {
    // Unverifiable: refuse it, and do not record a failure against any order.
    return new NextResponse("Invalid callback", { status: 400 });
  }

  /*
   * `findUnique`, on a column the schema now constrains to be unique.
   *
   * `findFirst` would quietly pick one row out of however many matched, which
   * on a duplicated reference means fulfilling an arbitrary order — and the
   * customer whose order lost the toss has paid and not been upgraded. The
   * constraint is what makes "the order this payment belongs to" a question
   * with one answer; this call is just the half that refuses to guess.
   */
  const order = await prisma.order.findUnique({
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
