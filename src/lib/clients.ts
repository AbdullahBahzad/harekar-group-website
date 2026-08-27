import { prisma } from "@/lib/prisma";
import { clientLogos, type ClientCategory } from "@/lib/client-logos";

export type PublicClientLogo = {
  id: string;
  name: string | null;
  category: ClientCategory;
  imageUrl: string;
  w: number;
  cx: number;
  cy: number;
};

/**
 * Published logos for the clients page wall.
 *
 * Falls back to the original hardcoded array when the table is empty or the
 * database is unreachable, matching every other public content fallback in
 * this codebase.
 */
export async function getPublishedClients(): Promise<PublicClientLogo[]> {
  try {
    const rows = await prisma.client.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        category: true,
        imageType: true,
        w: true,
        cx: true,
        cy: true,
        updatedAt: true,
      },
    });

    if (rows.length > 0) {
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category as ClientCategory,
        // Versioned so a replaced logo busts the image route's long cache.
        imageUrl: row.imageType
          ? `/api/clients/${row.id}/image?v=${row.updatedAt.getTime()}`
          : "/harekar-mark.png",
        w: row.w,
        cx: row.cx,
        cy: row.cy,
      }));
    }
  } catch (error) {
    console.error("Falling back to static client logos", error);
  }

  return clientLogos.map((logo) => ({
    id: logo.n,
    name: logo.name ?? null,
    category: logo.category,
    imageUrl: `/clients/logo-${logo.n}.png`,
    w: logo.w,
    cx: logo.cx,
    cy: logo.cy,
  }));
}
