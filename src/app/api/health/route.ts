import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Liveness and readiness for a load balancer or uptime check.
 *
 * The distinction that makes this useful: the process answering at all is
 * liveness, and it is not the interesting question — a Next server stays up
 * happily while every page behind it throws, because almost everything this
 * application does needs Postgres. So the check actually opens the database
 * with the cheapest round trip there is and reports 503 when it cannot.
 *
 * Deliberately unauthenticated, and deliberately says almost nothing. A health
 * endpoint is reachable by anyone who can find it, so it reports whether the
 * database answered and how long it took — never the error text, the driver
 * version, or the connection target, all of which are reconnaissance.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    // Logged in full server-side, where it is useful and not public.
    console.error("Health check failed to reach the database", error);
    return NextResponse.json(
      { status: "degraded", database: "unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { status: "ok", database: "ok", latencyMs: Date.now() - startedAt },
    { headers: { "Cache-Control": "no-store" } },
  );
}
