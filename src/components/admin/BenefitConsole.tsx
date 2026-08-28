"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import Panel from "@/components/admin/Panel";
import {
  createBenefit,
  deleteBenefit,
  seedFromStaticBenefits,
  toggleBenefitPublished,
  updateBenefit,
} from "@/app/[locale]/admin/benefits/actions";

export type ConsoleBenefit = {
  id: string;
  titleEn: string;
  titleAr: string | null;
  titleKu: string | null;
  bodyEn: string;
  bodyAr: string | null;
  bodyKu: string | null;
  published: boolean;
  sortOrder: number;
};

const inputClass =
  "border-bone/12 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors";

/** The careers page's "why work here" cards — list + editor, as everywhere else. */
export default function BenefitConsole({
  benefits,
  canSeed,
}: {
  benefits: ConsoleBenefit[];
  canSeed: boolean;
}) {
  const t = useTranslations("admin");
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const selected = benefits.find((b) => b.id === editing) ?? null;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel
        label={t("benefits.cards")}
        action={
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
            className="border-gold/40 text-gold hover:bg-gold hover:text-ink cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors"
          >
            {t("benefits.newCard")}
          </button>
        }
      >
        {benefits.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-bone/45 text-sm">{t("benefits.empty")}</p>
            {canSeed && (
              <form action={seedFromStaticBenefits} className="mt-6">
                <button
                  type="submit"
                  className="border-gold/40 text-gold hover:bg-gold hover:text-ink cursor-pointer rounded-full border px-5 py-2 text-sm transition-colors"
                >
                  {t("benefits.importExisting", { count: 5 })}
                </button>
              </form>
            )}
          </div>
        ) : (
          <ul className="divide-bone/6 divide-y">
            {benefits.map((benefit) => (
              <li key={benefit.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setEditing(benefit.id);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 p-3 text-start transition-colors",
                    benefit.id === editing ? "bg-gold/8" : "hover:bg-bone/[0.03]",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="text-bone/90 block truncate text-sm">
                      {benefit.titleEn}
                    </span>
                  </span>
                  {!benefit.published && (
                    <span className="text-bone/30 text-xs">
                      {t("common.hidden")}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {creating || selected ? (
        <BenefitEditor
          key={selected?.id ?? "new"}
          benefit={selected ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      ) : (
        <Panel label={t("common.editor")}>
          <p className="text-bone/45 px-5 py-10 text-center text-sm">
            {t("benefits.emptyEditor")}
          </p>
        </Panel>
      )}
    </div>
  );
}

function BenefitEditor({
  benefit,
  onClose,
}: {
  benefit?: ConsoleBenefit;
  onClose: () => void;
}) {
  const t = useTranslations("admin");
  const editing = Boolean(benefit);

  return (
    <Panel
      label={editing ? t("benefits.edit") : t("benefits.create")}
      action={
        <button
          type="button"
          onClick={onClose}
          className="text-bone/40 hover:text-bone cursor-pointer text-xs transition-colors"
        >
          {t("common.close")}
        </button>
      }
    >
      <form
        action={editing ? updateBenefit : createBenefit}
        className="space-y-4 p-5"
      >
        {benefit && <input type="hidden" name="id" value={benefit.id} />}

        {/*
         * Each block's `dir` is fixed by the language it stores, not by the
         * console's own. The English fields stay left-to-right even when the
         * operator is working in Arabic or Kurdish.
         */}
        <fieldset className="border-bone/8 space-y-2 border-s-2 ps-3">
          <legend className="text-gold/60 text-xs">
            {t("common.english")}
          </legend>
          <input
            name="titleEn"
            defaultValue={benefit?.titleEn ?? ""}
            dir="ltr"
            required
            autoComplete="off"
            placeholder={t("common.title")}
            className={inputClass}
          />
          <textarea
            name="bodyEn"
            defaultValue={benefit?.bodyEn ?? ""}
            dir="ltr"
            required
            rows={3}
            placeholder={t("common.body")}
            className={`${inputClass} resize-y`}
          />
        </fieldset>

        <fieldset className="border-bone/8 space-y-2 border-s-2 ps-3">
          <legend className="text-gold/60 text-xs">
            {t("common.arabic")}{" "}
            <span className="text-bone/25 ms-2">{t("common.optional")}</span>
          </legend>
          <input
            name="titleAr"
            defaultValue={benefit?.titleAr ?? ""}
            dir="rtl"
            autoComplete="off"
            placeholder={t("common.title")}
            className={inputClass}
          />
          <textarea
            name="bodyAr"
            defaultValue={benefit?.bodyAr ?? ""}
            dir="rtl"
            rows={3}
            placeholder={t("common.body")}
            className={`${inputClass} resize-y`}
          />
        </fieldset>

        <fieldset className="border-bone/8 space-y-2 border-s-2 ps-3">
          <legend className="text-gold/60 text-xs">
            {t("common.kurdish")}{" "}
            <span className="text-bone/25 ms-2">{t("common.optional")}</span>
          </legend>
          <input
            name="titleKu"
            defaultValue={benefit?.titleKu ?? ""}
            dir="rtl"
            autoComplete="off"
            placeholder={t("common.title")}
            className={inputClass}
          />
          <textarea
            name="bodyKu"
            defaultValue={benefit?.bodyKu ?? ""}
            dir="rtl"
            rows={3}
            placeholder={t("common.body")}
            className={`${inputClass} resize-y`}
          />
        </fieldset>

        <div className="flex flex-wrap items-center gap-5">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              name="published"
              defaultChecked={benefit?.published ?? true}
              className="accent-gold size-4 cursor-pointer"
            />
            <span className="text-bone/70 text-xs">
              {t("common.showOnSite")}
            </span>
          </label>

          <label className="flex items-center gap-2">
            <span className="text-bone/45 text-xs">{t("common.order")}</span>
            <input
              type="number"
              name="sortOrder"
              dir="ltr"
              defaultValue={benefit?.sortOrder ?? 0}
              className="border-bone/12 bg-ink/60 text-bone focus:border-gold w-20 border px-2 py-1 text-start text-xs tabular-nums outline-none"
            />
          </label>
        </div>

        <div className="border-bone/8 flex flex-wrap gap-2 border-t pt-4">
          <button
            type="submit"
            className="bg-gold text-ink hover:bg-gold-bright cursor-pointer rounded-full px-5 py-2 text-sm font-medium transition-colors"
          >
            {editing ? t("common.save") : t("benefits.createButton")}
          </button>

          {benefit && (
            <>
              <button
                type="submit"
                formAction={toggleBenefitPublished}
                formNoValidate
                className="border-bone/20 text-bone/70 hover:border-gold hover:text-gold cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors"
              >
                {benefit.published ? t("common.hide") : t("common.show")}
              </button>

              <button
                type="submit"
                formAction={deleteBenefit}
                formNoValidate
                className="border-status-critical/40 text-status-critical hover:bg-status-critical hover:text-ink ms-auto cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors"
              >
                {t("common.delete")}
              </button>
            </>
          )}
        </div>
      </form>
    </Panel>
  );
}
