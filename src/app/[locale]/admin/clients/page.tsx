import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { orPreview, sampleClients } from "@/lib/admin-preview";
import ClientConsole, {
  type ConsoleClient,
} from "@/components/admin/ClientConsole";

export default async function ClientsStation({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);
  const t = await getTranslations({ locale, namespace: "admin.clients" });

  const { data: clients, preview } = await orPreview<ConsoleClient[]>(
    async () => {
      const rows = await prisma.client.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          category: true,
          imageType: true,
          w: true,
          cx: true,
          cy: true,
          published: true,
          sortOrder: true,
          updatedAt: true,
        },
      });

      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        hasUpload: Boolean(row.imageType),
        imageUrl: row.imageType
          ? `/api/clients/${row.id}/image?v=${row.updatedAt.getTime()}`
          : "/harekar-mark.png",
        w: row.w,
        cx: row.cx,
        cy: row.cy,
        published: row.published,
        sortOrder: row.sortOrder,
      }));
    },
    sampleClients,
  );

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-bone text-3xl font-light">
          {t("title")}
        </h1>
        <p className="text-bone/55 mt-2 max-w-2xl text-sm leading-relaxed">
          {t("intro")}
        </p>
      </header>

      <ClientConsole
        clients={clients}
        canSeed={!preview && clients.length === 0}
      />
    </>
  );
}
