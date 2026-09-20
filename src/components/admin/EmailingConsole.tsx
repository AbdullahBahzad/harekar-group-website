"use client";

import {
  useMemo,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Panel from "@/components/admin/Panel";
import {
  addRecipient,
  removeRecipient,
  sendReportToSelected,
  type AddRecipientState,
  type SendToSelectedState,
} from "@/app/[locale]/admin/emailing/actions";
import { formatDate } from "@/lib/admin-format";
import {
  recipientFullName,
  type ReportRecipient,
} from "@/lib/recipient-shape";
import {
  reportEmailBody,
  reportEmailFilename,
  reportEmailSubject,
} from "@/lib/report-email";
import { cn } from "@/lib/utils";

/** A saved report offered as the message to send — just what the picker and
 * the preview need. */
export type EmailTemplate = { id: string; date: string };

type Tab = "individual" | "tags" | "companies";

type Group = { key: string; label: string; members: ReportRecipient[] };

const inputClass =
  "border-bone/16 bg-ink/60 text-bone placeholder:text-bone/35 focus:border-gold min-h-11 w-full min-w-0 rounded-md border px-3 py-2 text-sm outline-none transition-colors";

/**
 * Groups the list by one field. Entries with no value are gathered into a
 * single trailing group (key `""`) rather than dropped — an address saved
 * before companies existed must still be reachable from the Companies tab.
 */
function buildGroups(
  recipients: ReportRecipient[],
  pick: (recipient: ReportRecipient) => string | null,
  fallbackLabel: string,
): Group[] {
  const byKey = new Map<string, ReportRecipient[]>();
  for (const recipient of recipients) {
    const key = pick(recipient) ?? "";
    const members = byKey.get(key);
    if (members) members.push(recipient);
    else byKey.set(key, [recipient]);
  }

  return Array.from(byKey, ([key, members]) => ({
    key,
    label: key || fallbackLabel,
    members,
  })).sort(
    (a, b) =>
      Number(a.key === "") - Number(b.key === "") ||
      a.label.localeCompare(b.label),
  );
}

export default function EmailingConsole({
  recipients,
  templates,
}: {
  recipients: ReportRecipient[];
  templates: EmailTemplate[];
}) {
  const t = useTranslations("admin.emailing");
  const locale = useLocale();

  const [tab, setTab] = useState<Tab>("companies");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [sendState, setSendState] = useState<SendToSelectedState>({
    status: "idle",
  });
  const [isSending, startSend] = useTransition();
  const [isRemoving, startRemove] = useTransition();

  /*
   * Derived from the live list, never from `selected` alone: a client removed
   * elsewhere (or in another tab) would otherwise stay ticked as a ghost and
   * be counted, and sent, after it was gone.
   */
  const selectedRecipients = useMemo(
    () => recipients.filter((recipient) => selected.has(recipient.id)),
    [recipients, selected],
  );
  const allSelected =
    recipients.length > 0 && selectedRecipients.length === recipients.length;

  const companies = useMemo(
    () => buildGroups(recipients, (r) => r.company, t("noCompany")),
    [recipients, t],
  );
  const tags = useMemo(
    () => buildGroups(recipients, (r) => r.tag, t("noTag")),
    [recipients, t],
  );
  const groups = tab === "tags" ? tags : companies;

  const visibleIndividuals = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return recipients;
    return recipients.filter((recipient) =>
      [
        recipient.email,
        recipientFullName(recipient),
        recipient.company,
        recipient.tag,
      ]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(needle)),
    );
  }, [recipients, search]);

  function setMany(ids: string[], on: boolean) {
    setSelected((previous) => {
      const next = new Set(previous);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function toggleExpanded(key: string) {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  function handleRemove(id: string) {
    setMany([id], false);
    startRemove(async () => {
      const formData = new FormData();
      formData.set("id", id);
      await removeRecipient(formData);
    });
  }

  function handleSend() {
    const formData = new FormData();
    formData.set("reportId", templateId);
    formData.set("note", note);
    for (const recipient of selectedRecipients) {
      formData.append("id", recipient.id);
    }

    startSend(async () => {
      setSendState(await sendReportToSelected(formData));
    });
  }

  const template = templates.find((candidate) => candidate.id === templateId);
  const previewRecipient = selectedRecipients[0] ?? null;
  const dateLabel = template?.date.slice(0, 10) ?? "";
  const canSend =
    selectedRecipients.length > 0 && Boolean(template) && !isSending;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
      <AddClientPanel companies={companies.map((g) => g.key).filter(Boolean)} />

      <div className="min-w-0 space-y-4">
        {/* ---- audience ------------------------------------------------- */}
        <Panel label={t("sendTitle")}>
          <div className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-bone text-base font-medium">
                {t("targetAudience")}
              </h3>

              <label className="flex cursor-pointer items-center gap-2.5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={allSelected}
                  disabled={recipients.length === 0}
                  onClick={() =>
                    setMany(
                      recipients.map((recipient) => recipient.id),
                      !allSelected,
                    )
                  }
                  className={cn(
                    "relative h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    allSelected
                      ? "border-gold bg-gold/80"
                      : "border-bone/25 bg-bone/10",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "bg-bone absolute start-0.5 top-0.5 size-4.5 rounded-full transition-transform",
                      allSelected && "translate-x-5 rtl:-translate-x-5",
                    )}
                  />
                </button>
                <span className="text-bone/80 text-sm">{t("selectAll")}</span>
              </label>
            </div>

            <div role="tablist" aria-label={t("targetAudience")} className="flex flex-wrap gap-2">
              {(
                [
                  ["individual", t("tabIndividual"), <PersonIcon key="i" />],
                  ["tags", t("tabTags"), <TagIcon key="t" />],
                  ["companies", t("tabCompanies"), <BuildingIcon key="c" />],
                ] as [Tab, string, ReactNode][]
              ).map(([id, label, icon]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3.5 text-sm transition-colors",
                    tab === id
                      ? "border-gold/60 bg-gold/12 text-gold"
                      : "border-bone/16 text-bone/70 hover:border-bone/30 hover:text-bone",
                  )}
                >
                  <span className="size-4 shrink-0">{icon}</span>
                  {label}
                </button>
              ))}
            </div>

            {recipients.length === 0 ? (
              <p className="text-bone/50 border-bone/12 rounded-lg border border-dashed px-4 py-10 text-center text-sm">
                {t("emptyList")}
              </p>
            ) : (
              <div className="border-bone/14 grid overflow-hidden rounded-lg border md:grid-cols-2">
                {/* ---- browse ------------------------------------------- */}
                <div
                  role="tabpanel"
                  className="border-bone/14 min-w-0 md:border-e"
                >
                  {tab === "individual" && (
                    <div className="border-bone/12 border-b p-2">
                      <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={t("search")}
                        aria-label={t("search")}
                        className={inputClass}
                      />
                    </div>
                  )}

                  <ul className="max-h-72 overflow-y-auto p-1.5">
                    {tab === "individual" &&
                      visibleIndividuals.length === 0 && (
                        <li className="text-bone/50 px-3 py-6 text-center text-sm">
                          {t("noMatches")}
                        </li>
                      )}

                    {tab === "individual" &&
                      visibleIndividuals.map((recipient) => (
                        <li
                          key={recipient.id}
                          className="hover:bg-bone/[0.04] flex items-center gap-1 rounded-md pe-1"
                        >
                          <RecipientRow
                            recipient={recipient}
                            checked={selected.has(recipient.id)}
                            onChange={(on) => setMany([recipient.id], on)}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemove(recipient.id)}
                            disabled={isRemoving}
                            aria-label={t("remove")}
                            title={t("remove")}
                            className="text-bone/40 hover:text-status-critical flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors disabled:opacity-40"
                          >
                            <span aria-hidden>×</span>
                          </button>
                        </li>
                      ))}

                    {tab !== "individual" &&
                      groups.map((group) => {
                        const ids = group.members.map((member) => member.id);
                        const chosen = ids.filter((id) => selected.has(id));
                        const key = `${tab}:${group.key}`;
                        const isOpen = expanded.has(key);

                        return (
                          <li key={key}>
                            <div
                              className={cn(
                                "flex min-h-11 items-center gap-1 rounded-md ps-1 pe-2",
                                chosen.length > 0 && "bg-gold/10",
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => toggleExpanded(key)}
                                aria-expanded={isOpen}
                                aria-label={t(isOpen ? "collapse" : "expand")}
                                className="text-bone/55 hover:text-bone flex size-9 shrink-0 cursor-pointer items-center justify-center"
                              >
                                <svg
                                  viewBox="0 0 20 20"
                                  fill="none"
                                  className={cn(
                                    "size-4 transition-transform",
                                    isOpen
                                      ? "rotate-90"
                                      : "rtl:rotate-180",
                                  )}
                                  aria-hidden
                                >
                                  <path
                                    d="m7.5 4.5 5.5 5.5-5.5 5.5"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>

                              <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                                <TriCheckbox
                                  checked={chosen.length === ids.length}
                                  indeterminate={
                                    chosen.length > 0 &&
                                    chosen.length < ids.length
                                  }
                                  onChange={(on) => setMany(ids, on)}
                                />
                                <span dir="auto" className="text-bone/90 truncate text-sm">
                                  {group.label}
                                </span>
                                <span className="text-bone/50 shrink-0 text-sm tabular-nums">
                                  ({group.members.length})
                                </span>
                              </label>
                            </div>

                            {isOpen && (
                              <ul className="ms-9 pb-1">
                                {group.members.map((member) => (
                                  <li key={member.id}>
                                    <RecipientRow
                                      recipient={member}
                                      checked={selected.has(member.id)}
                                      onChange={(on) =>
                                        setMany([member.id], on)
                                      }
                                    />
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                  </ul>
                </div>

                {/* ---- who will receive it -------------------------------- */}
                <div className="border-bone/14 min-w-0 border-t md:border-t-0">
                  <div className="border-bone/12 flex items-center justify-between gap-2 border-b px-4 py-2.5">
                    <h4 className="text-bone text-sm font-medium">
                      {t("recipientsList")}
                    </h4>
                    <span className="text-bone/55 text-xs tabular-nums">
                      {t("selectedCount", { count: selectedRecipients.length })}
                    </span>
                  </div>

                  {selectedRecipients.length === 0 ? (
                    <p className="text-bone/50 px-4 py-8 text-center text-sm">
                      {t("nothingSelected")}
                    </p>
                  ) : (
                    <ul className="max-h-72 overflow-y-auto p-1.5">
                      {selectedRecipients.map((recipient) => (
                        <li key={recipient.id}>
                          <RecipientRow
                            recipient={recipient}
                            checked
                            emailOnly
                            onChange={() => setMany([recipient.id], false)}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </Panel>

        {/* ---- template + send ------------------------------------------ */}
        <Panel label={t("templateTitle")}>
          <div className="space-y-4 p-4">
            {templates.length === 0 ? (
              <p className="text-bone/55 text-sm leading-relaxed">
                {t("noTemplates")}{" "}
                <Link
                  href="/admin/sources"
                  className="text-gold hover:text-gold-bright underline underline-offset-2"
                >
                  {t("openSources")}
                </Link>
              </p>
            ) : (
              <>
                <select
                  value={templateId}
                  onChange={(event) => setTemplateId(event.target.value)}
                  aria-label={t("templateTitle")}
                  className={cn(inputClass, "cursor-pointer")}
                >
                  {templates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {t("templateLabel", {
                        date: formatDate(new Date(candidate.date), locale, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }),
                      })}
                    </option>
                  ))}
                </select>

                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder={t("notePlaceholder")}
                  aria-label={t("notePlaceholder")}
                  className={cn(inputClass, "resize-y")}
                />

                {/*
                 * Mirrors the message as it will arrive — same wording, same
                 * greeting rule — and is pinned LTR because the mail is English
                 * whatever language the console is in.
                 */}
                <div
                  dir="ltr"
                  className="border-bone/14 overflow-hidden rounded-lg border text-start"
                >
                  <div className="border-bone/12 bg-bone/[0.03] flex items-center gap-1.5 border-b px-3 py-2">
                    <span className="bg-status-critical/70 size-2.5 rounded-full" aria-hidden />
                    <span className="bg-status-elevated/70 size-2.5 rounded-full" aria-hidden />
                    <span className="bg-status-clear/70 size-2.5 rounded-full" aria-hidden />
                    <span className="text-bone/50 ms-2 truncate text-xs">
                      {t("previewSubject")}:{" "}
                      <span className="text-bone/80">
                        {reportEmailSubject(dateLabel)}
                      </span>
                    </span>
                  </div>
                  <div className="space-y-3 p-4">
                    {previewRecipient && (
                      <p dir="auto" className="text-bone/45 text-xs">
                        {t("previewFor", {
                          name:
                            recipientFullName(previewRecipient) ??
                            previewRecipient.email,
                        })}
                      </p>
                    )}
                    <pre className="text-bone/80 font-sans text-sm leading-relaxed whitespace-pre-wrap">
                      {reportEmailBody(previewRecipient?.firstName ?? null, note)}
                    </pre>
                    <p className="border-bone/16 text-bone/65 inline-flex max-w-full items-center gap-2 rounded-md border px-2.5 py-1 text-xs">
                      <span aria-hidden>📎</span>
                      <span className="truncate">
                        {reportEmailFilename(dateLabel)}
                      </span>
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3">
              {sendState.status !== "idle" && sendState.messageKey && (
                <p
                  role="status"
                  className={cn(
                    "me-auto text-sm leading-relaxed",
                    sendState.status === "error"
                      ? "text-status-critical"
                      : "text-status-clear",
                  )}
                >
                  {t(sendState.messageKey, sendState.values)}
                </p>
              )}

              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                title={
                  selectedRecipients.length === 0
                    ? t("noneSelected")
                    : undefined
                }
                className="bg-gold text-ink hover:bg-gold-bright flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg viewBox="0 0 20 20" fill="none" className="size-4 shrink-0" aria-hidden>
                  <rect x="2.75" y="4.75" width="14.5" height="10.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="m3.25 5.5 6.75 5 6.75-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {isSending
                  ? t("sending")
                  : t("sendSelected", { count: selectedRecipients.length })}
              </button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---- add a client ------------------------------------------------------ */

const emptyForm = {
  email: "",
  firstName: "",
  lastName: "",
  company: "",
  tag: "",
};

function AddClientPanel({ companies }: { companies: string[] }) {
  const t = useTranslations("admin.emailing");
  const [values, setValues] = useState(emptyForm);
  const [state, setState] = useState<AddRecipientState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();

  const set = (field: keyof typeof emptyForm) => (value: string) =>
    setValues((previous) => ({ ...previous, [field]: value }));

  /*
   * Called directly rather than through `<form action>`: React clears an
   * uncontrolled form after an action settles, which would wipe what the
   * operator typed even when the server rejected it. Holding the values here
   * means they are kept on an error and cleared only on success.
   */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const formData = new FormData();
    for (const [field, value] of Object.entries(values)) {
      formData.set(field, value);
    }

    startTransition(async () => {
      const result = await addRecipient(formData);
      setState(result);
      if (result.status === "success") setValues(emptyForm);
    });
  }

  const ready = values.email.trim() !== "" && values.company.trim() !== "";

  return (
    <Panel label={t("addTitle")}>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <Field label={t("emailLabel")}>
          <input
            type="email"
            dir="ltr"
            required
            value={values.email}
            onChange={(event) => set("email")(event.target.value)}
            placeholder={t("emailPlaceholder")}
            className={cn(inputClass, "text-start")}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("firstName")}>
            <input
              type="text"
              value={values.firstName}
              onChange={(event) => set("firstName")(event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label={t("lastName")}>
            <input
              type="text"
              value={values.lastName}
              onChange={(event) => set("lastName")(event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        {/*
         * Pick an existing company or type a new one — the select only fills
         * the text field, which stays the single source of the value, so a
         * company is never a choice between two inputs that could disagree.
         */}
        <div className="border-bone/16 rounded-lg border p-3">
          <Field label={t("company")} required>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
              <select
                value={companies.includes(values.company) ? values.company : ""}
                onChange={(event) => set("company")(event.target.value)}
                aria-label={t("companyPick")}
                disabled={companies.length === 0}
                className={cn(inputClass, "cursor-pointer disabled:opacity-40")}
              >
                <option value="">{t("companyPick")}</option>
                {companies.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
              <input
                type="text"
                required
                value={values.company}
                onChange={(event) => set("company")(event.target.value)}
                placeholder={t("companyNew")}
                aria-label={t("company")}
                className={inputClass}
              />
            </div>
          </Field>
        </div>

        <Field label={t("tag")}>
          <input
            type="text"
            value={values.tag}
            onChange={(event) => set("tag")(event.target.value)}
            placeholder={t("tagPlaceholder")}
            className={inputClass}
          />
        </Field>

        <button
          type="submit"
          disabled={!ready || isPending}
          className="bg-gold text-ink hover:bg-gold-bright min-h-11 w-full cursor-pointer rounded-lg px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? t("saving") : t("save")}
        </button>

        {state.status !== "idle" && state.messageKey && (
          <p
            role="status"
            className={cn(
              "text-sm",
              state.status === "error"
                ? "text-status-critical"
                : "text-status-clear",
            )}
          >
            {t(state.messageKey)}
          </p>
        )}
      </form>
    </Panel>
  );
}

/* ---- small parts ------------------------------------------------------- */

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="text-bone/75 mb-1.5 block text-sm font-medium">
        {label}
        {required && (
          <span className="text-status-critical ms-1" aria-hidden>
            *
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

/** One person: a checkbox beside their name and address. */
function RecipientRow({
  recipient,
  checked,
  onChange,
  emailOnly,
}: {
  recipient: ReportRecipient;
  checked: boolean;
  onChange: (on: boolean) => void;
  /** The "who will receive it" list shows just the address, as in the design. */
  emailOnly?: boolean;
}) {
  const name = recipientFullName(recipient);

  return (
    <label className="hover:bg-bone/[0.04] flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-gold size-4 shrink-0 cursor-pointer"
      />
      <span className="min-w-0 flex-1">
        {!emailOnly && name && (
          <span className="text-bone/90 block truncate text-sm">{name}</span>
        )}
        <span
          dir="ltr"
          className={cn(
            "block truncate text-start",
            emailOnly ? "text-bone/85 text-sm" : "text-bone/55 text-xs",
          )}
        >
          {recipient.email}
        </span>
      </span>
    </label>
  );
}

/** A checkbox that can show "some of these" — the native `indeterminate`
 * state has no attribute, only a DOM property, so it is set from a ref. */
function TriCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      ref={(element) => {
        if (element) element.indeterminate = indeterminate;
      }}
      // An indeterminate box reads as "none yet" when clicked, so the click
      // completes the group instead of clearing it.
      onChange={() => onChange(indeterminate ? true : !checked)}
      className="accent-gold size-4 shrink-0 cursor-pointer"
    />
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden>
      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.75 16.5a6.25 6.25 0 0 1 12.5 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden>
      <path d="M3 10.6V4.5A1.5 1.5 0 0 1 4.5 3h6.1a1.5 1.5 0 0 1 1.06.44l5.4 5.4a1.5 1.5 0 0 1 0 2.12l-5.1 5.1a1.5 1.5 0 0 1-2.12 0l-5.4-5.4A1.5 1.5 0 0 1 3 10.6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="7" cy="7" r="1" fill="currentColor" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden>
      <path d="M3.5 17.25V4.75A1 1 0 0 1 4.5 3.75h6a1 1 0 0 1 1 1v12.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M11.5 8.25h4a1 1 0 0 1 1 1v8h-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6 6.75h2.5M6 9.75h2.5M6 12.75h2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
