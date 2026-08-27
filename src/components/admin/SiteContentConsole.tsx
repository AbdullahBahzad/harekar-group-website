"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Panel from "@/components/admin/Panel";
import { saveSiteContent } from "@/app/[locale]/admin/content/actions";

type FieldSpec = { field: string; label: string; multiline?: boolean };
type Section = {
  title: string;
  fields: FieldSpec[];
  /** Plain (non-locale) figures shown beside this section's labels. */
  valueFields?: { field: string; label: string }[];
};

const SECTIONS: Section[] = [
  {
    title: "Hero",
    fields: [
      { field: "heroEyebrow", label: "Eyebrow" },
      { field: "heroTitle", label: "Title" },
      { field: "heroSubtitle", label: "Subtitle", multiline: true },
    ],
  },
  {
    title: "About",
    fields: [
      { field: "aboutEyebrow", label: "Eyebrow" },
      { field: "aboutTitle", label: "Title" },
      { field: "aboutBody1", label: "Paragraph 1", multiline: true },
      { field: "aboutBody2", label: "Paragraph 2", multiline: true },
      { field: "aboutBody3", label: "Paragraph 3", multiline: true },
    ],
  },
  {
    title: "Mission & Vision",
    fields: [
      { field: "missionTitle", label: "Mission title" },
      { field: "missionBody", label: "Mission body", multiline: true },
      { field: "visionTitle", label: "Vision title" },
      { field: "visionBody", label: "Vision body", multiline: true },
    ],
  },
  {
    title: "Stats strip",
    fields: [
      { field: "statExperienceLabel", label: "Experience — label" },
      { field: "statPersonnelLabel", label: "Personnel — label" },
      { field: "statSitesLabel", label: "Sites — label" },
      { field: "statCoverageLabel", label: "Coverage — label" },
    ],
    valueFields: [
      { field: "statExperienceValue", label: "Experience — value (e.g. 15+)" },
      { field: "statPersonnelValue", label: "Personnel — value (e.g. 800+)" },
      { field: "statSitesValue", label: "Sites — value (e.g. 120+)" },
      { field: "statCoverageValue", label: "Coverage — value (e.g. 24/7)" },
    ],
  },
  {
    title: "Footer",
    fields: [{ field: "footerTagline", label: "Tagline" }],
  },
  {
    title: "FAQ page intro",
    fields: [
      { field: "faqEyebrow", label: "Eyebrow" },
      { field: "faqTitle", label: "Title" },
      { field: "faqSubtitle", label: "Subtitle", multiline: true },
      { field: "faqCtaTitle", label: "CTA title" },
      { field: "faqCtaBody", label: "CTA body", multiline: true },
    ],
  },
  {
    title: "Careers page intro",
    fields: [
      { field: "careersEyebrow", label: "Eyebrow" },
      { field: "careersTitle", label: "Title" },
    ],
  },
  {
    title: "Contact page intro",
    fields: [
      { field: "contactEyebrow", label: "Eyebrow" },
      { field: "contactTitle", label: "Title" },
      { field: "contactSubtitle", label: "Subtitle", multiline: true },
    ],
  },
  {
    title: "Pro page",
    fields: [
      { field: "proEyebrow", label: "Eyebrow" },
      { field: "proTitle", label: "Title" },
      { field: "proSubtitle", label: "Subtitle", multiline: true },
    ],
  },
  {
    title: "Pro plans",
    fields: [
      { field: "planMonthlyName", label: "Monthly — name" },
      { field: "planMonthlyPeriod", label: "Monthly — period label" },
      { field: "planMonthlyBlurb", label: "Monthly — blurb", multiline: true },
      { field: "planYearlyName", label: "Yearly — name" },
      { field: "planYearlyPeriod", label: "Yearly — period label" },
      { field: "planYearlyBlurb", label: "Yearly — blurb", multiline: true },
    ],
  },
];

const inputClass =
  "border-bone/12 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors";

/**
 * The whole site's editable page copy, one section per public page. Saves as
 * a single form — there is one row to write, so there is one submit.
 *
 * `content` is the saved row, if any; `initial` carries the shipped English
 * copy for fields that have never been saved, so the first visit here is a
 * form to review rather than a blank one to retype the entire site into.
 */
type SaveState = { message: string | null; error: boolean };
const initialSaveState: SaveState = { message: null, error: false };

export default function SiteContentConsole({
  content,
  initial,
}: {
  content: Record<string, unknown> | null;
  initial: Record<string, string>;
}) {
  const [state, formAction] = useActionState<SaveState, FormData>(
    async (_prev, formData) => {
      try {
        await saveSiteContent(formData);
        return { message: "Saved.", error: false };
      } catch (err) {
        return {
          message: err instanceof Error ? err.message : "Save failed",
          error: true,
        };
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
      {state.message && (
        <p
          role="status"
          className={`border px-4 py-2 text-sm ${
            state.error
              ? "border-status-critical/40 bg-status-critical/10 text-status-critical"
              : "border-status-clear/40 bg-status-clear/10 text-status-clear"
          }`}
        >
          {state.message}
        </p>
      )}

      {SECTIONS.map((section) => (
        <Panel key={section.title} label={section.title}>
          <div className="space-y-6 p-5">
            {section.valueFields && (
              <div className="grid gap-3 sm:grid-cols-2">
                {section.valueFields.map(({ field, label }) => (
                  <label key={field} className="block">
                    <span className="text-bone/45 mb-1.5 block text-xs">
                      {label}
                    </span>
                    <input
                      name={field}
                      defaultValue={plainValueOf(field)}
                      required
                      autoComplete="off"
                      className={inputClass}
                    />
                  </label>
                ))}
              </div>
            )}

            {section.fields.map(({ field, label, multiline }) => (
              <fieldset key={field} className="border-bone/8 space-y-2 border-s-2 ps-3">
                <legend className="text-bone/60 px-1 text-xs">{label}</legend>

                <label className="block">
                  <span className="text-gold/60 mb-1 block text-[11px] tracking-[0.14em] uppercase">
                    English
                  </span>
                  {multiline ? (
                    <textarea
                      name={`${field}En`}
                      defaultValue={valueOf(field, "En")}
                      required
                      rows={3}
                      className={`${inputClass} resize-y`}
                    />
                  ) : (
                    <input
                      name={`${field}En`}
                      defaultValue={valueOf(field, "En")}
                      required
                      autoComplete="off"
                      className={inputClass}
                    />
                  )}
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-bone/35 mb-1 block text-[11px] tracking-[0.14em] uppercase">
                      Arabic <span className="normal-case">optional</span>
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
                    <span className="text-bone/35 mb-1 block text-[11px] tracking-[0.14em] uppercase">
                      Kurdish <span className="normal-case">optional</span>
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
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-gold text-ink hover:bg-gold-bright w-full cursor-pointer rounded-xl px-5 py-3 text-sm font-medium shadow-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save all content"}
    </button>
  );
}
