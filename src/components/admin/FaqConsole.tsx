"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import Panel from "@/components/admin/Panel";
import {
  createFaqItem,
  deleteFaqItem,
  seedFromStaticFaq,
  toggleFaqPublished,
  updateFaqItem,
} from "@/app/[locale]/admin/faq/actions";

export type ConsoleFaqItem = {
  id: string;
  questionEn: string;
  questionAr: string | null;
  questionKu: string | null;
  answerEn: string;
  answerAr: string | null;
  answerKu: string | null;
  listEn: string[] | null;
  listAr: string[] | null;
  listKu: string[] | null;
  published: boolean;
  sortOrder: number;
};

const inputClass =
  "border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors";

/**
 * The FAQ station. A list on the left, an editor on the right — the same
 * shape as the intelligence and services consoles, because an operator
 * scanning a list of questions and opening one to edit is the same task as
 * scanning a list of anything else.
 */
export default function FaqConsole({
  items,
  canSeed,
}: {
  items: ConsoleFaqItem[];
  canSeed: boolean;
}) {
  const t = useTranslations("admin");
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const selected = items.find((item) => item.id === editing) ?? null;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel
        label={t("faq.questions")}
        action={
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
            className="border-gold/50 text-gold hover:bg-gold hover:text-ink flex min-h-11 cursor-pointer items-center rounded-full border px-3 text-xs transition-colors"
          >
            {t("faq.newQuestion")}
          </button>
        }
      >
        {items.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-bone/55 text-sm">{t("faq.empty")}</p>
            {canSeed && (
              <form action={seedFromStaticFaq} className="mt-6">
                <button
                  type="submit"
                  className="border-gold/50 text-gold hover:bg-gold hover:text-ink cursor-pointer rounded-full border px-5 py-2 text-sm transition-colors"
                >
                  {t("faq.importExisting", { count: 6 })}
                </button>
              </form>
            )}
          </div>
        ) : (
          <ul className="divide-bone/6 divide-y">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setEditing(item.id);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 p-3 text-start transition-colors",
                    item.id === editing ? "bg-gold/8" : "hover:bg-bone/[0.03]",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="text-bone/90 block truncate text-sm">
                      {item.questionEn}
                    </span>
                  </span>

                  {!item.published && (
                    <span className="text-bone/56 text-xs">
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
        <FaqEditor
          key={selected?.id ?? "new"}
          item={selected ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      ) : (
        <Panel label={t("common.editor")}>
          <p className="text-bone/55 px-5 py-10 text-center text-sm">
            {t("faq.emptyEditor")}
          </p>
        </Panel>
      )}
    </div>
  );
}

function FaqEditor({
  item,
  onClose,
}: {
  item?: ConsoleFaqItem;
  onClose: () => void;
}) {
  const t = useTranslations("admin");
  const editing = Boolean(item);

  return (
    <Panel
      label={editing ? t("faq.edit") : t("faq.create")}
      action={
        <button
          type="button"
          onClick={onClose}
          className="text-bone/50 hover:text-bone flex min-h-11 cursor-pointer items-center text-xs transition-colors"
        >
          {t("common.close")}
        </button>
      }
    >
      <form
        action={editing ? updateFaqItem : createFaqItem}
        className="space-y-4 p-5"
      >
        {item && <input type="hidden" name="id" value={item.id} />}

        <LocaleBlock
          locale="English"
          dir="ltr"
          required
          question={
            <input
              name="questionEn"
              defaultValue={item?.questionEn ?? ""}
              required
              autoComplete="off"
              className={inputClass}
            />
          }
          answer={
            <textarea
              name="answerEn"
              defaultValue={item?.answerEn ?? ""}
              required
              rows={3}
              className={`${inputClass} resize-y`}
            />
          }
          list={
            <textarea
              name="listEn"
              defaultValue={item?.listEn?.join("\n") ?? ""}
              rows={3}
              placeholder={t("faq.bulletsPlaceholder")}
              className={`${inputClass} resize-y`}
            />
          }
        />

        <LocaleBlock
          locale="العربية"
          dir="rtl"
          question={
            <input
              name="questionAr"
              defaultValue={item?.questionAr ?? ""}
              dir="rtl"
              autoComplete="off"
              className={inputClass}
            />
          }
          answer={
            <textarea
              name="answerAr"
              defaultValue={item?.answerAr ?? ""}
              dir="rtl"
              rows={3}
              className={`${inputClass} resize-y`}
            />
          }
          list={
            <textarea
              name="listAr"
              defaultValue={item?.listAr?.join("\n") ?? ""}
              dir="rtl"
              rows={3}
              className={`${inputClass} resize-y`}
            />
          }
        />

        <LocaleBlock
          locale="کوردی"
          dir="rtl"
          question={
            <input
              name="questionKu"
              defaultValue={item?.questionKu ?? ""}
              dir="rtl"
              autoComplete="off"
              className={inputClass}
            />
          }
          answer={
            <textarea
              name="answerKu"
              defaultValue={item?.answerKu ?? ""}
              dir="rtl"
              rows={3}
              className={`${inputClass} resize-y`}
            />
          }
          list={
            <textarea
              name="listKu"
              defaultValue={item?.listKu?.join("\n") ?? ""}
              dir="rtl"
              rows={3}
              className={`${inputClass} resize-y`}
            />
          }
        />

        <div className="flex flex-wrap items-center gap-5">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              name="published"
              defaultChecked={item?.published ?? true}
              className="accent-gold size-4 cursor-pointer"
            />
            <span className="text-bone/70 text-xs">
              {t("common.showOnSite")}
            </span>
          </label>

          <label className="flex items-center gap-2">
            <span className="text-bone/55 text-xs">{t("common.order")}</span>
            <input
              type="number"
              name="sortOrder"
              dir="ltr"
              defaultValue={item?.sortOrder ?? 0}
              className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-20 border px-2 py-1 text-start text-xs tabular-nums outline-none"
            />
          </label>
        </div>

        <div className="border-bone/12 flex flex-wrap gap-2 border-t pt-4">
          <button
            type="submit"
            className="bg-gold text-ink hover:bg-gold-bright cursor-pointer rounded-full px-5 py-2 text-sm font-medium transition-colors"
          >
            {editing ? t("common.save") : t("faq.createButton")}
          </button>

          {item && (
            <>
              <button
                type="submit"
                formAction={toggleFaqPublished}
                formNoValidate
                className="border-bone/26 text-bone/70 hover:border-gold hover:text-gold cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors"
              >
                {item.published ? t("common.hide") : t("common.show")}
              </button>

              <button
                type="submit"
                formAction={deleteFaqItem}
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

/**
 * One language's fields for an FAQ entry.
 *
 * `dir` is required, not optional-meaning-LTR: these boxes hold the *site's*
 * copy, so their direction follows the language they store, not the console's.
 * The English box must stay left-to-right even while the operator works in
 * Kurdish, which an inherited direction would not guarantee.
 */
function LocaleBlock({
  locale,
  dir,
  required,
  question,
  answer,
  list,
}: {
  locale: string;
  dir: "rtl" | "ltr";
  required?: boolean;
  question: ReactNode;
  answer: ReactNode;
  list: ReactNode;
}) {
  const t = useTranslations("admin");

  return (
    <fieldset className="border-bone/12 space-y-2 border-s-2 ps-3">
      <legend className="text-gold/70 text-xs">
        {locale}
        {!required && (
          <span className="text-bone/52 ms-2">{t("common.optional")}</span>
        )}
      </legend>
      <div>
        <span className="text-bone/50 mb-1 block text-xs">
          {t("faq.question")}
        </span>
        <div dir={dir}>{question}</div>
      </div>
      <div>
        <span className="text-bone/50 mb-1 block text-xs">
          {t("faq.answer")}
        </span>
        <div dir={dir}>{answer}</div>
      </div>
      <div>
        <span className="text-bone/50 mb-1 block text-xs">
          {t("faq.bullets")}
        </span>
        <div dir={dir}>{list}</div>
      </div>
    </fieldset>
  );
}
