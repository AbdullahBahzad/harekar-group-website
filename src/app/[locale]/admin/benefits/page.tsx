import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { orPreview, sampleCareerBenefits } from "@/lib/admin-preview";
import BenefitConsole, {
  type ConsoleBenefit,
} from "@/components/admin/BenefitConsole";

export default async function BenefitsStation({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);
  const t = await getTranslations({ locale, namespace: "admin.benefits" });

  const { data: benefits, preview } = await orPreview<ConsoleBenefit[]>(
    () =>
      prisma.careerBenefit.findMany({
        orderBy: [{ sortOrder: "asc" }, { titleEn: "asc" }],
      }),
    sampleCareerBenefits,
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

      <BenefitConsole
        benefits={benefits}
        canSeed={!preview && benefits.length === 0}
      />
    </>
  );
}
