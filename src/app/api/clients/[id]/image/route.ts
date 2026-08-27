import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Serves a client logo uploaded through the console.
 *
 * Public by design — these are marketing images on the clients page, not
 * private data like a CV, so there is no auth check here.
 *
 * The cache header is aggressive because the URL is versioned with the row's
 * `updatedAt` (see `lib/clients.ts`): a replaced logo gets a new URL, so an
 * immutable response can never go stale.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    select: { imageData: true, imageType: true },
  });

  if (!client?.imageData || !client.imageType) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(client.imageData), {
    headers: {
      "Content-Type": client.imageType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
