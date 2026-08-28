import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { orPreview, sampleSiteContent } from "@/lib/admin-preview";
import SiteContentConsole from "@/components/admin/SiteContentConsole";

/**
 * Where each editable field's English text lives in the message catalogues,
 * dot-path style. Used only to seed the form's first paint when nothing has
 * been saved to `SiteContent` yet — after the first save, the row itself is
 * the source of truth and this map is never consulted again.
 */
const FIELD_KEYS: Record<string, string> = {
  heroEyebrow: "hero.eyebrow",
  heroTitle: "hero.title",
  heroSubtitle: "hero.subtitle",
  aboutEyebrow: "about.eyebrow",
  aboutTitle: "about.title",
  aboutBody1: "about.body.p1",
  aboutBody2: "about.body.p2",
  aboutBody3: "about.body.p3",
  missionTitle: "about.pillars.mission.title",
  missionBody: "about.pillars.mission.body",
  visionTitle: "about.pillars.vision.title",
  visionBody: "about.pillars.vision.body",
  statExperienceLabel: "proof.stats.experience.label",
  statPersonnelLabel: "proof.stats.personnel.label",
  statSitesLabel: "proof.stats.sites.label",
  statCoverageLabel: "proof.stats.coverage.label",
  footerTagline: "footer.tagline",
  faqEyebrow: "faq.eyebrow",
  faqTitle: "faq.title",
  faqSubtitle: "faq.subtitle",
  faqCtaTitle: "faq.ctaTitle",
  faqCtaBody: "faq.ctaBody",
  contactEyebrow: "contact.eyebrow",
  contactTitle: "contact.title",
  contactSubtitle: "contact.subtitle",
  careersEyebrow: "careers.eyebrow",
  careersTitle: "careers.title",
  proEyebrow: "pro.eyebrow",
  proTitle: "pro.title",
  proSubtitle: "pro.subtitle",
  planMonthlyName: "pro.plans.monthly.name",
  planMonthlyPeriod: "pro.plans.monthly.period",
  planMonthlyBlurb: "pro.plans.monthly.blurb",
  planYearlyName: "pro.plans.yearly.name",
  planYearlyPeriod: "pro.plans.yearly.period",
  planYearlyBlurb: "pro.plans.yearly.blurb",
};

const VALUE_KEYS: Record<string, string> = {
  statExperienceValue: "proof.stats.experience.value",
  statPersonnelValue: "proof.stats.personnel.value",
  statSitesValue: "proof.stats.sites.value",
  statCoverageValue: "proof.stats.coverage.value",
};

function readPath(source: unknown, path: string): string {
  const value = path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined,
      source,
    );
  return typeof value === "string" ? value : "";
}

export default async function ContentStation({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);
  const t = await getTranslations({ locale, namespace: "admin.content" });

  const { data: content } = await orPreview(
    () => prisma.siteContent.findUnique({ where: { id: "site" } }),
    sampleSiteContent,
  );

  // Nothing saved yet — prefill the English column from the shipped copy so
  // the first save is a review, not a blank form the operator has to
  // retype the whole site into.
  const initial: Record<string, string> = {};
  if (!content) {
    const en = (await import("@/messages/en.json")).default;
    for (const [field, path] of Object.entries(FIELD_KEYS)) {
      initial[`${field}En`] = readPath(en, path);
    }
    for (const [field, path] of Object.entries(VALUE_KEYS)) {
      initial[field] = readPath(en, path);
    }
  }

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

      <SiteContentConsole content={content} initial={initial} />
    </>
  );
}
