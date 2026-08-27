import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

export type PublicFaqItem = {
  id: string;
  question: string;
  answer: string;
  list: string[] | null;
};

/** The six questions the site shipped with, used only when the table is empty. */
const STATIC_IDS = [
  "types",
  "hours",
  "response",
  "licensed",
  "vetting",
  "specialized",
] as const;

const suffix: Record<Locale, "En" | "Ar" | "Ku"> = {
  en: "En",
  ar: "Ar",
  ckb: "Ku",
};

/**
 * Published FAQ entries for the given locale, newest console edits first in
 * priority over the shipped catalogue.
 *
 * Falls back to the original six questions from the message catalogues when
 * the table is empty or the database is unreachable — the FAQ page must never
 * render blank because nobody has opened the console yet.
 */
export async function getPublishedFaqItems(
  locale: Locale,
): Promise<PublicFaqItem[]> {
  try {
    const rows = await prisma.faqItem.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
    });

    if (rows.length > 0) {
      const s = suffix[locale];
      return rows.map((row) => {
        const values = row as unknown as Record<string, unknown>;
        return {
          id: row.id,
          question: (values[`question${s}`] as string) || row.questionEn,
          answer: (values[`answer${s}`] as string) || row.answerEn,
          list:
            (values[`list${s}`] as string[] | null) ??
            (row.listEn as string[] | null) ??
            null,
        };
      });
    }
  } catch (error) {
    console.error("Falling back to static FAQ items", error);
  }

  const t = await getTranslations({ locale, namespace: "faq.items" });
  return STATIC_IDS.map((id) => ({
    id,
    question: t(`${id}.q`),
    answer: t(`${id}.a`),
    list: id === "types" ? (t.raw(`${id}.list`) as string[]) : null,
  }));
}
