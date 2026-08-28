import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import IntelConsole, {
  type ConsoleMarker,
} from "@/components/admin/IntelConsole";
import { orPreview, sampleMarkers } from "@/lib/admin-preview";

export default async function IntelligenceStation({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);
  const t = await getTranslations({ locale, namespace: "admin.intelligence" });

  /*
   * Serialisation happens inside both branches so the live query and the
   * preview fallback produce exactly the same shape. Mapping afterwards would
   * force the sample data to impersonate a full Prisma row — including columns
   * the console never reads — just to satisfy the type.
   *
   * Dates become strings here because a Date cannot cross into a client
   * component, and letting it be stringified implicitly gives a different
   * format per runtime.
   */
  const { data: markers, preview } = await orPreview<ConsoleMarker[]>(
    async () => {
      const rows = await prisma.intelMarker.findMany({
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
        include: { updatedBy: { select: { name: true, email: true } } },
      });

      return rows.map((marker) => ({
        id: marker.id,
        label: marker.label,
        longitude: marker.longitude,
        latitude: marker.latitude,
        severity: marker.severity,
        access: marker.access,
        headline: marker.headline,
        body: marker.body,
        published: marker.published,
        updatedAt: marker.updatedAt.toISOString(),
        updatedByName:
          marker.updatedBy?.name ?? marker.updatedBy?.email ?? null,
      }));
    },
    sampleMarkers.map((marker) => ({
      id: marker.id,
      label: marker.label,
      longitude: marker.longitude,
      latitude: marker.latitude,
      severity: marker.severity,
      access: marker.access,
      headline: marker.headline,
      body: marker.body,
      published: marker.published,
      updatedAt: marker.updatedAt.toISOString(),
      updatedByName: marker.updatedBy?.name ?? null,
    })),
  );

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-bone text-3xl font-light">
          {t("title")}
        </h1>
        <p className="text-bone/45 mt-2 max-w-2xl text-sm leading-relaxed">
          {t("intro")}
        </p>
      </header>

      {/* Seeding writes to the database, so it is never offered in preview. */}
      <IntelConsole
        markers={markers}
        canSeed={!preview && markers.length === 0}
      />
    </>
  );
}
