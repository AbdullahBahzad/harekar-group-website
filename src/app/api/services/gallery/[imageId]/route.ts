import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Serves one gallery photo of a service. Public, like the main photo
 * (`/api/services/[id]/image`), and immutable: a gallery photo is never
 * edited in place, only added or removed, so its id is its version.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ imageId: string }> },
) {
  const { imageId } = await params;

  const image = await prisma.serviceImage.findUnique({
    where: { id: imageId },
    select: { data: true, type: true },
  });

  if (!image) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.type,
      "Cache-Control": "public, max-age=31536000, immutable",
      // Uploads are arbitrary bytes; never let a browser sniff them as HTML.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
