"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import Panel from "@/components/admin/Panel";
import {
  clearServiceImage,
  createService,
  deleteService,
  seedFromStaticServices,
  toggleServicePublished,
  updateService,
} from "@/app/[locale]/admin/services/actions";

export type ConsoleService = {
  id: string;
  slug: string;
  group: string;
  titleEn: string;
  titleAr: string | null;
  titleKu: string | null;
  descriptionEn: string;
  descriptionAr: string | null;
  descriptionKu: string | null;
  icon: string | null;
  hasUpload: boolean;
  imageUrl: string;
  published: boolean;
  sortOrder: number;
};

/** Stored group values. The label each one shows comes from `admin.services.groups`. */
const GROUP_IDS = ["protection", "response", "logistics"] as const;

/**
 * The services station.
 *
 * A catalogue, not a form list: the photo is the thing an operator is actually
 * changing most of the time, so every row leads with its image and the editor
 * shows the current one full width above the upload field. A table of slugs
 * would hide the only property you cannot verify by reading.
 */
export default function ServiceConsole({
  services,
  canSeed,
  iconNames,
}: {
  services: ConsoleService[];
  canSeed: boolean;
  iconNames: string[];
}) {
  const t = useTranslations("admin");
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const selected = services.find((service) => service.id === editing) ?? null;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel
        label={t("services.catalogue")}
        action={
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
            className="border-gold/40 text-gold hover:bg-gold hover:text-ink flex min-h-11 cursor-pointer items-center border px-3 text-xs transition-colors"
          >
            {t("services.newService")}
          </button>
        }
      >
        {services.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-bone/45 text-sm">{t("services.empty")}</p>
            {canSeed && (
              <form action={seedFromStaticServices} className="mt-6">
                <button
                  type="submit"
                  className="border-gold/40 text-gold hover:bg-gold hover:text-ink cursor-pointer rounded-full border px-5 py-2 text-xs transition-colors"
                >
                  {t("services.importExisting", { count: 13 })}
                </button>
              </form>
            )}
          </div>
        ) : (
          <ul className="divide-bone/6 divide-y">
            {services.map((service) => (
              <li key={service.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setEditing(service.id);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 p-3 text-start transition-colors",
                    service.id === editing
                      ? "bg-gold/8"
                      : "hover:bg-bone/[0.03]",
                  )}
                >
                  {/* The photo is the point, so it leads. */}
                  <span className="border-bone/10 relative block size-12 shrink-0 overflow-hidden border">
                    <Image
                      src={service.imageUrl}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                      unoptimized={service.hasUpload}
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="text-bone/90 block truncate text-sm">
                      {service.titleEn}
                    </span>
                    <span className="text-bone/35 block truncate text-xs">
                      <span dir="ltr">{service.slug}</span> ·{" "}
                      {t(`services.groups.${service.group}`)}
                    </span>
                  </span>

                  {!service.published && (
                    <span className="text-bone/30 text-xs">
                      {t("common.hidden")}
                    </span>
                  )}
                  {service.hasUpload && (
                    <span className="text-gold/70 text-xs">
                      {t("services.newTag")}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {creating || selected ? (
        <ServiceEditor
          key={selected?.id ?? "new"}
          service={selected ?? undefined}
          iconNames={iconNames}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      ) : (
        <Panel label={t("common.editor")}>
          <p className="text-bone/45 px-5 py-10 text-center text-sm">
            {t("services.emptyEditor")}
          </p>
        </Panel>
      )}
    </div>
  );
}

function ServiceEditor({
  service,
  iconNames,
  onClose,
}: {
  service?: ConsoleService;
  iconNames: string[];
  onClose: () => void;
}) {
  const t = useTranslations("admin");
  const editing = Boolean(service);

  return (
    <Panel
      label={editing ? t("services.edit") : t("services.create")}
      action={
        <button
          type="button"
          onClick={onClose}
          className="text-bone/40 hover:text-bone flex min-h-11 cursor-pointer items-center text-xs transition-colors"
        >
          {t("common.close")}
        </button>
      }
    >
      {/*
       * `encType` is mandatory: without it the browser posts the file input as
       * a filename string and the upload silently arrives empty.
       */}
      <form
        action={editing ? updateService : createService}
        encType="multipart/form-data"
        className="space-y-4 p-5"
      >
        {service && <input type="hidden" name="id" value={service.id} />}

        {service && (
          <div className="border-bone/10 relative aspect-[16/10] w-full overflow-hidden border">
            <Image
              src={service.imageUrl}
              alt={service.titleEn}
              fill
              sizes="(min-width: 1280px) 40vw, 100vw"
              className="object-cover"
              unoptimized={service.hasUpload}
            />
            <span className="bg-ink/70 text-bone/60 absolute bottom-0 start-0 px-2 py-1 text-xs backdrop-blur">
              {service.hasUpload
                ? t("common.uploaded")
                : t("common.shippedImage")}
            </span>
          </div>
        )}

        <Field label={t("services.photoLabel")}>
          {/* `file:me-3` — logical, so the gap sits inside the button in RTL too. */}
          <input
            type="file"
            name="image"
            accept="image/webp,image/jpeg,image/png,image/avif"
            className="text-bone/60 file:border-gold/40 file:text-gold hover:file:bg-gold hover:file:text-ink w-full cursor-pointer text-xs file:me-3 file:cursor-pointer file:border file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:transition-colors"
          />
          {service?.hasUpload && (
            <span className="text-bone/30 mt-1.5 block text-xs">
              {t("services.photoKeep")}
            </span>
          )}
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("services.slug")}>
            {/* A URL segment: always Latin, always LTR. */}
            <input
              name="slug"
              dir="ltr"
              defaultValue={service?.slug ?? ""}
              required
              autoComplete="off"
              className="border-bone/12 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-start text-xs outline-none"
            />
          </Field>

          <Field label={t("services.group")}>
            <select
              name="group"
              defaultValue={service?.group ?? "protection"}
              className="border-bone/12 bg-ink/60 text-bone focus:border-gold w-full cursor-pointer border px-3 py-2 text-xs outline-none"
            >
              {GROUP_IDS.map((id) => (
                <option key={id} value={id}>
                  {t(`services.groups.${id}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={t("services.icon")}>
          <select
            name="icon"
            defaultValue={service?.icon ?? ""}
            className="border-bone/12 bg-ink/60 text-bone focus:border-gold w-full cursor-pointer border px-3 py-2 text-xs outline-none"
          >
            <option value="">{t("common.none")}</option>
            {iconNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Field>

        {/*
         * English is required; Arabic and Kurdish are not, so a service can go
         * live in one language and be translated later rather than waiting on
         * a translator. Empty fields fall back to English on the site.
         */}
        <LocaleBlock
          locale="English"
          dir="ltr"
          required
          title={<input name="titleEn" defaultValue={service?.titleEn ?? ""} required autoComplete="off" className={inputClass} />}
          description={<textarea name="descriptionEn" defaultValue={service?.descriptionEn ?? ""} required rows={3} className={`${inputClass} resize-y`} />}
        />

        <LocaleBlock
          locale="العربية"
          dir="rtl"
          title={<input name="titleAr" defaultValue={service?.titleAr ?? ""} dir="rtl" autoComplete="off" className={inputClass} />}
          description={<textarea name="descriptionAr" defaultValue={service?.descriptionAr ?? ""} dir="rtl" rows={3} className={`${inputClass} resize-y`} />}
        />

        <LocaleBlock
          locale="کوردی"
          dir="rtl"
          title={<input name="titleKu" defaultValue={service?.titleKu ?? ""} dir="rtl" autoComplete="off" className={inputClass} />}
          description={<textarea name="descriptionKu" defaultValue={service?.descriptionKu ?? ""} dir="rtl" rows={3} className={`${inputClass} resize-y`} />}
        />

        <div className="flex flex-wrap items-center gap-5">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              name="published"
              defaultChecked={service?.published ?? true}
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
              defaultValue={service?.sortOrder ?? 0}
              className="border-bone/12 bg-ink/60 text-bone focus:border-gold w-20 border px-2 py-1 text-start text-xs tabular-nums outline-none"
            />
          </label>
        </div>

        <div className="border-bone/8 flex flex-wrap gap-2 border-t pt-4">
          <button
            type="submit"
            className="bg-gold text-ink hover:bg-gold-bright cursor-pointer px-5 py-2 text-xs transition-colors"
          >
            {editing ? t("common.save") : t("services.createButton")}
          </button>

          {service && (
            <>
              <button
                type="submit"
                formAction={toggleServicePublished}
                formNoValidate
                className="border-bone/20 text-bone/70 hover:border-gold hover:text-gold cursor-pointer border px-4 py-2 text-xs transition-colors"
              >
                {service.published ? t("common.hide") : t("common.show")}
              </button>

              {service.hasUpload && (
                <button
                  type="submit"
                  formAction={clearServiceImage}
                  formNoValidate
                  className="border-bone/20 text-bone/70 hover:border-gold hover:text-gold cursor-pointer border px-4 py-2 text-xs transition-colors"
                >
                  {t("services.removePhoto")}
                </button>
              )}

              <button
                type="submit"
                formAction={deleteService}
                formNoValidate
                className="border-status-critical/40 text-status-critical hover:bg-status-critical hover:text-ink ms-auto cursor-pointer border px-4 py-2 text-xs transition-colors"
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

const inputClass =
  "border-bone/12 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors";

/**
 * One language's fields for a service.
 *
 * `dir` is required rather than optional-meaning-LTR. These inputs hold the
 * *site's* copy, not the console's, so each one's direction is fixed by the
 * language it stores — the English box has to stay left-to-right even when the
 * operator is driving the console in Kurdish, and an omitted `dir` would let it
 * inherit RTL from the page and type English backwards.
 */
function LocaleBlock({
  locale,
  dir,
  required,
  title,
  description,
}: {
  locale: string;
  dir: "rtl" | "ltr";
  required?: boolean;
  title: ReactNode;
  description: ReactNode;
}) {
  const t = useTranslations("admin.common");

  return (
    <fieldset className="border-bone/8 space-y-2 border-s-2 ps-3">
      <legend className="sr-only">{locale}</legend>
      <p className="text-gold/60 text-xs">
        {locale}
        {!required && (
          <span className="text-bone/25 ms-2 normal-case">
            {t("optional")}
          </span>
        )}
      </p>
      <div dir={dir}>{title}</div>
      <div dir={dir}>{description}</div>
    </fieldset>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-bone/45 mb-1.5 block text-xs">
        {label}
      </span>
      {children}
    </label>
  );
}
