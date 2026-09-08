"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import Panel from "@/components/admin/Panel";
import { saveSiteContent } from "@/app/[locale]/admin/content/actions";

/**
 * `labelKey` indexes `admin.content.fields`, `titleKey` indexes
 * `admin.content.sections`. The database column name stays in `field` — it is
 * the form's wire format and must never move with the interface language.
 */
type FieldSpec = { field: string; labelKey: string; multiline?: boolean };
type Section = {
  titleKey: string;
  fields: FieldSpec[];
  /** Plain (non-locale) figures shown beside this section's labels. */
  valueFields?: { field: string; labelKey: string }[];
};

const SECTIONS: Section[] = [
  {
    titleKey: "hero",
    fields: [
      { field: "heroEyebrow", labelKey: "eyebrow" },
      { field: "heroTitle", labelKey: "title" },
      { field: "heroSubtitle", labelKey: "subtitle", multiline: true },
    ],
  },
  {
    titleKey: "about",
    fields: [
      { field: "aboutEyebrow", labelKey: "eyebrow" },
      { field: "aboutTitle", labelKey: "title" },
      { field: "aboutBody1", labelKey: "paragraph1", multiline: true },
      { field: "aboutBody2", labelKey: "paragraph2", multiline: true },
      { field: "aboutBody3", labelKey: "paragraph3", multiline: true },
    ],
  },
  {
    titleKey: "missionVision",
    fields: [
      { field: "missionTitle", labelKey: "missionTitle" },
      { field: "missionBody", labelKey: "missionBody", multiline: true },
      { field: "visionTitle", labelKey: "visionTitle" },
      { field: "visionBody", labelKey: "visionBody", multiline: true },
    ],
  },
  {
    titleKey: "stats",
    fields: [
      { field: "statExperienceLabel", labelKey: "statExperienceLabel" },
      { field: "statPersonnelLabel", labelKey: "statPersonnelLabel" },
      { field: "statSitesLabel", labelKey: "statSitesLabel" },
      { field: "statCoverageLabel", labelKey: "statCoverageLabel" },
    ],
    valueFields: [
      { field: "statExperienceValue", labelKey: "statExperienceValue" },
      { field: "statPersonnelValue", labelKey: "statPersonnelValue" },
      { field: "statSitesValue", labelKey: "statSitesValue" },
      { field: "statCoverageValue", labelKey: "statCoverageValue" },
    ],
  },
  {
    titleKey: "footer",
    fields: [{ field: "footerTagline", labelKey: "tagline" }],
  },
  {
    titleKey: "faq",
    fields: [
      { field: "faqEyebrow", labelKey: "eyebrow" },
      { field: "faqTitle", labelKey: "title" },
      { field: "faqSubtitle", labelKey: "subtitle", multiline: true },
      { field: "faqCtaTitle", labelKey: "ctaTitle" },
      { field: "faqCtaBody", labelKey: "ctaBody", multiline: true },
    ],
  },
  {
    titleKey: "careers",
    fields: [
      { field: "careersEyebrow", labelKey: "eyebrow" },
      { field: "careersTitle", labelKey: "title" },
    ],
  },
  {
    titleKey: "contact",
    fields: [
      { field: "contactEyebrow", labelKey: "eyebrow" },
      { field: "contactTitle", labelKey: "title" },
      { field: "contactSubtitle", labelKey: "subtitle", multiline: true },
    ],
  },
  {
    titleKey: "pro",
    fields: [
      { field: "proEyebrow", labelKey: "eyebrow" },
      { field: "proTitle", labelKey: "title" },
      { field: "proSubtitle", labelKey: "subtitle", multiline: true },
    ],
  },
  {
    titleKey: "plans",
    fields: [
      { field: "planMonthlyName", labelKey: "monthlyName" },
      { field: "planMonthlyPeriod", labelKey: "monthlyPeriod" },
      { field: "planMonthlyBlurb", labelKey: "monthlyBlurb", multiline: true },
      { field: "planYearlyName", labelKey: "yearlyName" },
      { field: "planYearlyPeriod", labelKey: "yearlyPeriod" },
      { field: "planYearlyBlurb", labelKey: "yearlyBlurb", multiline: true },
    ],
  },
];

const inputClass =
  "border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors";

/**
 * The whole site's editable page copy, one section per public page. Saves as
 * a single form — there is one row to write, so there is one submit.
 *
 * `content` is the saved row, if any; `initial` carries the shipped English
 * copy for fields that have never been saved, so the first visit here is a
 * form to review rather than a blank one to retype the entire site into.
 */
/**
 * The outcome carries a key, not a sentence, so it can be said in whichever
 * language the console is running in.
 */
type SaveState = { messageKey: string | null; error: boolean };
const initialSaveState: SaveState = { messageKey: null, error: false };

export default function SiteContentConsole({
  content,
  initial,
}: {
  content: Record<string, unknown> | null;
  initial: Record<string, string>;
}) {
  const t = useTranslations("admin");
  const [state, formAction] = useActionState<SaveState, FormData>(
    async (_prev, formData) => {
      try {
        await saveSiteContent(formData);
        return { messageKey: "common.saved", error: false };
      } catch {
        return { messageKey: "common.saveFailed", error: true };
      }
    },
    initialSaveState,
  );

  const valueOf = (field: string, suffix: "En" | "Ar" | "Ku") => {
    const key = `${field}${suffix}`;
    const value = content?.[key];
    if (typeof value === "string") return value;
    return suffix === "En" ? (initial[key] ?? "") : "";
  };

  /** For the plain (non-locale) stat-value inputs. */
  const plainValueOf = (field: string) => {
    const value = content?.[field];
    return typeof value === "string" ? value : (initial[field] ?? "");
  };

  return (
    <form action={formAction} className="space-y-5">
      {state.messageKey && (
        <p
          role="status"
          className={`border px-4 py-2 text-sm ${
            state.error
              ? "border-status-critical/40 bg-status-critical/10 text-status-critical"
              : "border-status-clear/40 bg-status-clear/10 text-status-clear"
          }`}
        >
          {t(state.messageKey)}
        </p>
      )}

      {SECTIONS.map((section) => (
        <Panel
          key={section.titleKey}
          label={t(`content.sections.${section.titleKey}`)}
        >
          <div className="space-y-6 p-5">
            {section.valueFields && (
              <div className="grid gap-3 sm:grid-cols-2">
                {section.valueFields.map(({ field, labelKey }) => (
                  <label key={field} className="block">
                    <span className="text-bone/55 mb-1.5 block text-xs">
                      {t(`content.fields.${labelKey}`)}
                    </span>
                    {/*
                     * A figure like "15+" or "24/7" — the same characters on
                     * the site in every language, so it is typed LTR here.
                     */}
                    <input
                      name={field}
                      dir="ltr"
                      defaultValue={plainValueOf(field)}
                      required
                      autoComplete="off"
                      className={`${inputClass} text-start`}
                    />
                  </label>
                ))}
              </div>
            )}

            {section.fields.map(({ field, labelKey, multiline }) => (
              <fieldset key={field} className="border-bone/12 space-y-2 border-s-2 ps-3">
                <legend className="text-bone/70 px-1 text-xs">
                  {t(`content.fields.${labelKey}`)}
                </legend>

                {/*
                 * Each language's box is pinned to that language's direction —
                 * it holds the site's copy, not the console's chrome, so the
                 * English field types left-to-right whatever the operator's
                 * own interface language is.
                 */}
                <label className="block">
                  <span className="text-gold/70 mb-1 block text-[11px] tracking-[0.14em] uppercase">
                    {t("common.english")}
                  </span>
                  {multiline ? (
                    <textarea
                      name={`${field}En`}
                      dir="ltr"
                      defaultValue={valueOf(field, "En")}
                      required
                      rows={3}
                      className={`${inputClass} resize-y`}
                    />
                  ) : (
                    <input
                      name={`${field}En`}
                      dir="ltr"
                      defaultValue={valueOf(field, "En")}
                      required
                      autoComplete="off"
                      className={inputClass}
                    />
                  )}
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-bone/60 mb-1 block text-[11px] tracking-[0.14em] uppercase">
                      {t("common.arabic")}{" "}
                      <span className="normal-case">
                        {t("common.optional")}
                      </span>
                    </span>
                    {multiline ? (
                      <textarea
                        name={`${field}Ar`}
                        defaultValue={valueOf(field, "Ar")}
                        dir="rtl"
                        rows={2}
                        className={`${inputClass} resize-y`}
                      />
                    ) : (
                      <input
                        name={`${field}Ar`}
                        defaultValue={valueOf(field, "Ar")}
                        dir="rtl"
                        autoComplete="off"
                        className={inputClass}
                      />
                    )}
                  </label>

                  <label className="block">
                    <span className="text-bone/60 mb-1 block text-[11px] tracking-[0.14em] uppercase">
                      {t("common.kurdish")}{" "}
                      <span className="normal-case">
                        {t("common.optional")}
                      </span>
                    </span>
                    {multiline ? (
                      <textarea
                        name={`${field}Ku`}
                        defaultValue={valueOf(field, "Ku")}
                        dir="rtl"
                        rows={2}
                        className={`${inputClass} resize-y`}
                      />
                    ) : (
                      <input
                        name={`${field}Ku`}
                        defaultValue={valueOf(field, "Ku")}
                        dir="rtl"
                        autoComplete="off"
                        className={inputClass}
                      />
                    )}
                  </label>
                </div>
              </fieldset>
            ))}
          </div>
        </Panel>
      ))}

      <div className="sticky bottom-4">
        <SaveButton />
      </div>
    </form>
  );
}

function SaveButton() {
  const t = useTranslations("admin");
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-gold text-ink hover:bg-gold-bright w-full cursor-pointer rounded-xl px-5 py-3 text-sm font-medium shadow-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? t("common.saving") : t("content.saveAll")}
    </button>
  );
}
