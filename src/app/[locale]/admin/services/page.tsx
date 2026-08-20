import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { serviceGroups } from "@/data/services";
import { orPreview, sampleServices } from "@/lib/admin-preview";
import ServiceConsole, {
  type ConsoleService,
} from "@/components/admin/ServiceConsole";

export default async function ServicesStation({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);

  const iconNames = serviceGroups.flatMap(
    (group) => group.services as readonly string[],
  );

  /*
   * `imageData` is excluded deliberately. Thirteen services at a few hundred
   * KB each would be several megabytes pulled into memory to render a list
   * that only needs to know *whether* a photo exists — `imageType` answers
   * that for nothing.
   */
  const { data: services, preview } = await orPreview<ConsoleService[]>(
    async () => {
      const rows = await prisma.service.findMany({
        orderBy: [{ sortOrder: "asc" }, { titleEn: "asc" }],
        select: {
          id: true, slug: true, group: true, icon: true,
          titleEn: true, titleAr: true, titleKu: true,
          descriptionEn: true, descriptionAr: true, descriptionKu: true,
          imageType: true, published: true, sortOrder: true, updatedAt: true,
        },
      });

      return rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        group: row.group,
        titleEn: row.titleEn,
        titleAr: row.titleAr,
        titleKu: row.titleKu,
        descriptionEn: row.descriptionEn,
        descriptionAr: row.descriptionAr,
        descriptionKu: row.descriptionKu,
        icon: row.icon,
        hasUpload: Boolean(row.imageType),
        // Versioned so replacing a photo busts the image route's long cache.
        imageUrl: row.imageType
          ? `/api/services/${row.id}/image?v=${row.updatedAt.getTime()}`
          : `/services/${row.slug}.webp`,
        published: row.published,
        sortOrder: row.sortOrder,
      }));
    },
    sampleServices,
  );

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-bone text-3xl font-light">Services</h1>
        <p className="text-bone/45 mt-2 max-w-2xl text-sm leading-relaxed">
          The service lines shown on the site and in the rotating orbit. Copy,
          grouping and photography are all edited here.
        </p>
      </header>

      <ServiceConsole
        services={services}
        canSeed={!preview && services.length === 0}
        iconNames={iconNames}
      />
    </>
  );
}
