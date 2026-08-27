import { setRequestLocale } from "next-intl/server";
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
          Career benefits
        </h1>
        <p className="text-bone/45 mt-2 max-w-2xl text-sm leading-relaxed">
          The &ldquo;why work here&rdquo; cards shown on the careers page.
        </p>
      </header>

      <BenefitConsole
        benefits={benefits}
        canSeed={!preview && benefits.length === 0}
      />
    </>
  );
}
