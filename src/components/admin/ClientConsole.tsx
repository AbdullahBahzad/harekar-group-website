"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import Panel from "@/components/admin/Panel";
import { clientCategories } from "@/lib/client-logos";
import {
  createClient,
  deleteClient,
  seedFromStaticClients,
  toggleClientPublished,
  updateClient,
} from "@/app/[locale]/admin/clients/actions";

export type ConsoleClient = {
  id: string;
  name: string | null;
  category: string;
  imageUrl: string;
  hasUpload: boolean;
  w: number;
  cx: number;
  cy: number;
  published: boolean;
  sortOrder: number;
};

const inputClass =
  "border-bone/12 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors";

/**
 * The clients station.
 *
 * Same catalogue-plus-editor shape as Services: a logo is the thing an
 * operator is actually changing most of the time, so every row leads with its
 * mark. `w`/`cx`/`cy` are exposed as plain number fields rather than a
 * drag-to-position control — three numbers an operator nudges by eye against
 * the live site, matching how the shipped values were originally tuned.
 */
export default function ClientConsole({
  clients,
  canSeed,
}: {
  clients: ConsoleClient[];
  canSeed: boolean;
}) {
  const t = useTranslations("admin");
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const selected = clients.find((client) => client.id === editing) ?? null;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel
        label={t("clients.logos")}
        action={
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
            className="border-gold/40 text-gold hover:bg-gold hover:text-ink flex min-h-11 cursor-pointer items-center rounded-full border px-3 text-xs transition-colors"
          >
            {t("clients.newLogo")}
          </button>
        }
      >
        {clients.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-bone/45 text-sm">{t("clients.empty")}</p>
            {canSeed && (
              <form action={seedFromStaticClients} className="mt-6">
                <button
                  type="submit"
                  className="border-gold/40 text-gold hover:bg-gold hover:text-ink cursor-pointer rounded-full border px-5 py-2 text-sm transition-colors"
                >
                  {t("clients.importExisting", { count: 37 })}
                </button>
              </form>
            )}
          </div>
        ) : (
          <ul className="divide-bone/6 divide-y">
            {clients.map((client) => (
              <li key={client.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setEditing(client.id);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 p-3 text-start transition-colors",
                    client.id === editing ? "bg-gold/8" : "hover:bg-bone/[0.03]",
                  )}
                >
                  <span className="border-bone/10 bg-ink relative block size-12 shrink-0 overflow-hidden border">
                    <Image
                      src={client.imageUrl}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-contain p-1"
                      unoptimized={client.hasUpload}
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="text-bone/90 block truncate text-sm">
                      {client.name ?? t("common.unnamed")}
                    </span>
                    <span className="text-bone/35 block truncate text-xs">
                      {t(`clients.categories.${client.category}`)}
                    </span>
                  </span>

                  {!client.published && (
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
        <ClientEditor
          key={selected?.id ?? "new"}
          client={selected ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      ) : (
        <Panel label={t("common.editor")}>
          <p className="text-bone/45 px-5 py-10 text-center text-sm">
            {t("clients.emptyEditor")}
          </p>
        </Panel>
      )}
    </div>
  );
}

function ClientEditor({
  client,
  onClose,
}: {
  client?: ConsoleClient;
  onClose: () => void;
}) {
  const t = useTranslations("admin");
  const editing = Boolean(client);

  return (
    <Panel
      label={editing ? t("clients.edit") : t("clients.create")}
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
       * `encType` is mandatory: without it the browser posts the file input
       * as a filename string and the upload silently arrives empty.
       */}
      <form
        action={editing ? updateClient : createClient}
        encType="multipart/form-data"
        className="space-y-4 p-5"
      >
        {client && <input type="hidden" name="id" value={client.id} />}

        {client && (
          <div className="border-bone/10 bg-ink relative aspect-[2.4] w-full overflow-hidden border">
            <Image
              src={client.imageUrl}
              alt={client.name ?? ""}
              fill
              sizes="(min-width: 1280px) 40vw, 100vw"
              className="object-contain p-6"
              unoptimized={client.hasUpload}
            />
            <span className="bg-ink/70 text-bone/60 absolute bottom-0 start-0 px-2 py-1 text-xs backdrop-blur">
              {client.hasUpload
                ? t("common.uploaded")
                : t("common.shippedImage")}
            </span>
          </div>
        )}

        <Field label={t("clients.logoLabel")}>
          {/* `file:me-3` — logical, so the gap sits inside the button in RTL too. */}
          <input
            type="file"
            name="image"
            accept="image/webp,image/png,image/jpeg,image/avif"
            required={!editing}
            className="text-bone/60 file:border-gold/40 file:text-gold hover:file:bg-gold hover:file:text-ink w-full cursor-pointer text-xs file:me-3 file:cursor-pointer file:border file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:transition-colors"
          />
          {client?.hasUpload && (
            <span className="text-bone/30 mt-1.5 block text-xs">
              {t("clients.logoKeep")}
            </span>
          )}
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("clients.nameLabel")}>
            <input
              name="name"
              defaultValue={client?.name ?? ""}
              autoComplete="off"
              placeholder={t("clients.namePlaceholder")}
              className={inputClass}
            />
          </Field>

          <Field label={t("clients.category")}>
            <select
              name="category"
              defaultValue={client?.category ?? clientCategories[0]}
              className={`${inputClass} cursor-pointer`}
            >
              {clientCategories.map((category) => (
                <option key={category} value={category}>
                  {t(`clients.categories.${category}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/*
         * The source artwork varies from a hairline wordmark to a nearly
         * square crest, each with its own padding — a uniform box makes some
         * logos read as threads next to ones that fill their cell. These
         * three numbers correct that per logo, same as the shipped values.
         */}
        {/* Geometry, pinned LTR so the decimals read the same in every language. */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("clients.width")}>
            <input
              type="number"
              name="w"
              dir="ltr"
              defaultValue={client?.w ?? 60}
              min={5}
              max={100}
              step={0.1}
              className={`${inputClass} text-start tabular-nums`}
            />
          </Field>
          <Field label={t("clients.centreX")}>
            <input
              type="number"
              name="cx"
              dir="ltr"
              defaultValue={client?.cx ?? 50}
              min={0}
              max={100}
              step={0.1}
              className={`${inputClass} text-start tabular-nums`}
            />
          </Field>
          <Field label={t("clients.centreY")}>
            <input
              type="number"
              name="cy"
              dir="ltr"
              defaultValue={client?.cy ?? 50}
              min={0}
              max={100}
              step={0.1}
              className={`${inputClass} text-start tabular-nums`}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-5">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              name="published"
              defaultChecked={client?.published ?? true}
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
              defaultValue={client?.sortOrder ?? 0}
              className="border-bone/12 bg-ink/60 text-bone focus:border-gold w-20 border px-2 py-1 text-start text-xs tabular-nums outline-none"
            />
          </label>
        </div>

        <div className="border-bone/8 flex flex-wrap gap-2 border-t pt-4">
          <button
            type="submit"
            className="bg-gold text-ink hover:bg-gold-bright cursor-pointer rounded-full px-5 py-2 text-sm font-medium transition-colors"
          >
            {editing ? t("common.save") : t("clients.createButton")}
          </button>

          {client && (
            <>
              <button
                type="submit"
                formAction={toggleClientPublished}
                formNoValidate
                className="border-bone/20 text-bone/70 hover:border-gold hover:text-gold cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors"
              >
                {client.published ? t("common.hide") : t("common.show")}
              </button>

              <button
                type="submit"
                formAction={deleteClient}
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-bone/45 mb-1.5 block text-xs">{label}</span>
      {children}
    </label>
  );
}
