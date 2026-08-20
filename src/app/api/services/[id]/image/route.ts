import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Serves a service photo uploaded through the console.
 *
 * Public by design — these are marketing images on the services page, not
 * private data like a CV, so there is no auth check here.
 *
 * The cache header is aggressive because the URL is versioned with the row's
 * `updatedAt` (see `lib/services.ts`): a replaced photo gets a new URL, so an
 * immutable response can never go stale.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const service = await prisma.service.findUnique({
    where: { id },
    select: { imageData: true, imageType: true },
  });

  if (!service?.imageData || !service.imageType) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(service.imageData), {
    headers: {
      "Content-Type": service.imageType,
      "Cache-Control": "public, max-age=31536000, immutable",
      // Uploads are arbitrary bytes; never let a browser sniff them as HTML.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
