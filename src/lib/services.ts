import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { serviceGroups, type ServiceKey } from "@/data/services";

/** What both the orbit and the grid need to render one service. */
export type ResolvedService = {
  id: string;
  slug: string;
  group: string;
  title: string;
  description: string;
  /** Absolute path to the card image. */
  imageUrl: string;
  /** Line icon to draw, when one of the known glyphs applies. */
  icon: ServiceKey | null;
};

/** Known icon names, so a free-text column cannot smuggle in a missing glyph. */
const iconNames = new Set<string>(
  serviceGroups.flatMap((group) => group.services as readonly string[]),
);

function asIcon(value: string | null): ServiceKey | null {
  return value && iconNames.has(value) ? (value as ServiceKey) : null;
}

/**
 * The published service lines, resolved for one locale.
 *
 * Falls back to the original hardcoded list when the table is empty or the
 * database is unreachable — the services section is most of the home page, and
 * a database blip should not empty it.
 *
 * Copy falls back per field rather than per record: a service translated into
 * English but not yet Kurdish shows its English text to a Kurdish reader,
 * which is far better than showing them a blank card.
 */
export async function getPublishedServices(
  locale: string,
): Promise<ResolvedService[]> {
  try {
    const rows = await prisma.service.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { titleEn: "asc" }],
      select: {
        id: true, slug: true, group: true, icon: true,
        titleEn: true, titleAr: true, titleKu: true,
        descriptionEn: true, descriptionAr: true, descriptionKu: true,
        imageData: false, imageType: true, updatedAt: true,
      },
    });

    if (rows.length === 0) return staticServices(locale);

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      group: row.group,
      title:
        (locale === "ar" ? row.titleAr : locale === "ckb" ? row.titleKu : null) ??
        row.titleEn,
      description:
        (locale === "ar"
          ? row.descriptionAr
          : locale === "ckb"
            ? row.descriptionKu
            : null) ?? row.descriptionEn,
      /*
       * `updatedAt` in the query string busts the browser cache the moment an
       * operator replaces a photo. Without it the route's long cache header
       * would keep serving the old image for a year.
       */
      imageUrl: row.imageType
        ? `/api/services/${row.id}/image?v=${row.updatedAt.getTime()}`
        : `/services/${row.slug}.webp`,
      icon: asIcon(row.icon),
    }));
  } catch (error) {
    console.error("Falling back to static services", error);
    return staticServices(locale);
  }
}

/** The original compiled-in list, read through the message catalogues. */
async function staticServices(locale: string): Promise<ResolvedService[]> {
  const t = await getTranslations({ locale, namespace: "services" });

  return serviceGroups.flatMap((group) =>
    group.services.map((key) => ({
      id: key,
      slug: key,
      group: group.id,
      title: t(`items.${key}.title`),
      description: t(`items.${key}.description`),
      imageUrl: `/services/${key}.webp`,
      icon: key as ServiceKey,
    })),
  );
}
