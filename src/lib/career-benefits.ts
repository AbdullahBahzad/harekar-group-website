import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

export type PublicCareerBenefit = {
  id: string;
  title: string;
  body: string;
};

/** The five cards the site shipped with, used only when the table is empty. */
const STATIC_IDS = [
  "environment",
  "development",
  "collaboration",
  "projects",
  "excellence",
] as const;

const suffix: Record<Locale, "En" | "Ar" | "Ku"> = {
  en: "En",
  ar: "Ar",
  ckb: "Ku",
};

/**
 * Published "why work here" cards for the careers page.
 *
 * Falls back to the five cards from the message catalogues when the table is
 * empty or the database is unreachable, matching every other public content
 * fallback in this codebase.
 */
export async function getPublishedCareerBenefits(
  locale: Locale,
): Promise<PublicCareerBenefit[]> {
  try {
    const rows = await prisma.careerBenefit.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
    });

    if (rows.length > 0) {
      const s = suffix[locale];
      return rows.map((row) => {
        const values = row as unknown as Record<string, unknown>;
        return {
          id: row.id,
          title: (values[`title${s}`] as string) || row.titleEn,
          body: (values[`body${s}`] as string) || row.bodyEn,
        };
      });
    }
  } catch (error) {
    console.error("Falling back to static career benefits", error);
  }

  const t = await getTranslations({ locale, namespace: "careers.benefits" });
  return STATIC_IDS.map((id) => ({
    id,
    title: t(`${id}.title`),
    body: t(`${id}.body`),
  }));
}
