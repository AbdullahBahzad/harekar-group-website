import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { orPreview, sampleFaqItems } from "@/lib/admin-preview";
import FaqConsole, { type ConsoleFaqItem } from "@/components/admin/FaqConsole";

export default async function FaqStation({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);
  const t = await getTranslations({ locale, namespace: "admin.faq" });

  const { data: items, preview } = await orPreview<ConsoleFaqItem[]>(
    () =>
      prisma.faqItem.findMany({
        orderBy: [{ sortOrder: "asc" }, { questionEn: "asc" }],
      }) as unknown as Promise<ConsoleFaqItem[]>,
    sampleFaqItems as unknown as ConsoleFaqItem[],
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

      <FaqConsole items={items} canSeed={!preview && items.length === 0} />
    </>
  );
}
