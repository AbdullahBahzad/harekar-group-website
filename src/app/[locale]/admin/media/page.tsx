import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { orPreview } from "@/lib/admin-preview";
import { acceptedTypes, mediaSlotIds, mediaSlots } from "@/data/media-slots";
import MediaConsole, { type ConsoleMediaItem } from "@/components/admin/MediaConsole";

/**
 * The Media station: the homepage video, its poster and the large section
 * photos, each replaceable — or restorable to the shipped original — without
 * a deploy.
 */
export default async function MediaStation({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations({ locale, namespace: "admin.media" });

  const { data: records, preview } = await orPreview(
    () =>
      prisma.siteMedia.findMany({
        select: { slot: true, fileName: true, size: true, updatedAt: true },
      }),
    [],
  );

  const items: ConsoleMediaItem[] = mediaSlotIds.map((slot) => {
    const { kind, maxBytes, fallback } = mediaSlots[slot];
    const record = records.find((row) => row.slot === slot);
    return {
      slot,
      kind,
      maxBytes,
      accept: acceptedTypes[kind].join(","),
      url: record ? `/api/media/${slot}?v=${record.updatedAt.getTime()}` : fallback,
      upload: record
        ? {
            fileName: record.fileName,
            size: record.size,
            updatedAt: record.updatedAt.toISOString(),
          }
        : null,
    };
  });

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-bone text-3xl font-light">{t("title")}</h1>
        <p className="text-bone/55 mt-2 max-w-2xl text-sm leading-relaxed">{t("intro")}</p>
      </header>

      <MediaConsole items={items} readOnly={preview} />
    </>
  );
}
