"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDate } from "@/lib/admin-format";
import Panel from "@/components/admin/Panel";
import {
  generateReportDraft,
  saveReport,
  deleteReport,
  fetchAllSourceHeadlines,
  pullHeadlineItems,
  addReportSource,
  deleteReportSource,
  type SourceHeadlines,
  type CombinedSource,
} from "@/app/[locale]/admin/sources/actions";
/*
 * From `report-shape`, not `reports`: this is a client component, and
 * `reports.ts` reaches for `node:dns` and the Anthropic SDK at import time.
 * The action imports above are safe regardless — "use server" strips
 * everything but the callable reference from the client bundle no matter
 * what that action's own module imports internally.
 */
import { REGIONS, THREAT_LEVELS } from "@/lib/report-shape";
import { meetsMinimumSeverity } from "@/lib/headline-relevance";
import type {
  ConsoleReport,
  Region,
  ReportNewsItem,
  ThreatLevel,
} from "@/lib/report-shape";
import type { Headline } from "@/lib/headlines";

// Re-exported so existing importers of this component keep working; the type
// itself now lives in `report-shape`, which the server may safely import.
export type { ConsoleReport };

type SourceRow = { key: string; url: string; notes: string; region: Region };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function newRow(region: Region = "KURDISTAN"): SourceRow {
  return { key: crypto.randomUUID(), url: "", notes: "", region };
}

/**
 * The reports station.
 *
 * Two steps, deliberately not one: sources go in on the left, and nothing
 * reaches the database until the analyst has reviewed and edited what came
 * back on the right. Claude drafts the write-up; approving it stays a
 * separate, explicit act.
 */
export default function ReportConsole({
  reports,
  canGenerate,
  sources: reportSources,
}: {
  reports: ConsoleReport[];
  canGenerate: boolean;
  /** The built-in eleven plus whatever an operator has added — see `report-sources-db.ts`. */
  sources: CombinedSource[];
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [sources, setSources] = useState<SourceRow[]>([newRow()]);
  const [draftItems, setDraftItems] = useState<ReportNewsItem[] | null>(null);
  /*
   * A key under `admin`, not the raw `Error.message`. Next redacts
   * server-action errors before they reach the browser in production, so the
   * raw message was never showable anyway — and this one translates.
   */
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Kept separate from `isPending` above: fetching or pulling headlines
  // should not disable Save/Delete elsewhere on the page, and vice versa.
  const [headlineGroups, setHeadlineGroups] = useState<
    SourceHeadlines[] | null
  >(null);
  const [checkedHeadlines, setCheckedHeadlines] = useState<
    Map<string, { title: string; url: string; region: Region }>
  >(new Map());
  const [isFetchingHeadlines, startHeadlinesTransition] = useTransition();
  const [isPullingHeadlines, startPullTransition] = useTransition();
  // Which single headline's one-click "Use" button is in flight, if any —
  // separate from `checkedHeadlines`, which drives the batch flow instead.
  const [pullingUrl, setPullingUrl] = useState<string | null>(null);

  // Which of `reportSources` to include the next time headlines are
  // fetched — "fetch only Channel8" is just this set holding one url.
  // Starts with everything selected, matching the old always-fetch-all
  // behaviour by default.
  const [selectedSourceUrls, setSelectedSourceUrls] = useState<Set<string>>(
    () => new Set(reportSources.map((source) => source.url)),
  );
  // Client-side only — narrows what the fetched checklist *shows*, not what
  // gets fetched. Nothing here is sent back to the server.
  const [minSeverity, setMinSeverity] = useState<ThreatLevel>("LOW");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // The "add a source" form, and pending state for both add and delete.
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceRegion, setNewSourceRegion] = useState<Region>("IRAQ");
  const [isManagingSources, startManageSourcesTransition] = useTransition();

  const [date, setDate] = useState(today());
  const [kurdistanThreat, setKurdistanThreat] =
    useState<ThreatLevel>("MODERATE");
  const [iraqThreat, setIraqThreat] = useState<ThreatLevel>("HIGH");
  const [politicalKurdistan, setPoliticalKurdistan] = useState("Stable");
  const [politicalIraq, setPoliticalIraq] = useState("Acceptable");
  const [weather, setWeather] = useState("");

  function updateSource(key: string, patch: Partial<SourceRow>) {
    setSources((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function handleGenerate() {
    setErrorKey(null);
    const formData = new FormData();
    for (const row of sources) {
      formData.append("itemUrl", row.url);
      formData.append("itemNotes", row.notes);
      formData.append("itemRegion", row.region);
    }
    startTransition(async () => {
      try {
        const items = await generateReportDraft(formData);
        setDraftItems(items);
      } catch {
        setErrorKey("reports.generationFailed");
      }
    });
  }

  /**
   * Pulls today's candidate headlines from whichever sources are checked in
   * the picker below — every source by default, matching the old
   * always-fetch-all behaviour, or just the ones left selected.
   */
  function handleFetchHeadlines() {
    if (selectedSourceUrls.size === 0) return;
    setErrorKey(null);
    startHeadlinesTransition(async () => {
      try {
        const groups = await fetchAllSourceHeadlines(
          Array.from(selectedSourceUrls),
        );
        setHeadlineGroups(groups);
        setCheckedHeadlines(new Map());
      } catch {
        setErrorKey("reports.headlinesFailed");
      }
    });
  }

  function toggleSourceSelected(url: string) {
    setSelectedSourceUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  /** "Fetch only this one" — replaces the whole selection with a single source. */
  function handleFetchOneSource(url: string) {
    setSelectedSourceUrls(new Set([url]));
    setErrorKey(null);
    startHeadlinesTransition(async () => {
      try {
        const groups = await fetchAllSourceHeadlines([url]);
        setHeadlineGroups(groups);
        setCheckedHeadlines(new Map());
      } catch {
        setErrorKey("reports.headlinesFailed");
      }
    });
  }

  function handleAddSource() {
    setErrorKey(null);
    const formData = new FormData();
    formData.set("name", newSourceName);
    formData.set("url", newSourceUrl);
    formData.set("defaultRegion", newSourceRegion);
    startManageSourcesTransition(async () => {
      try {
        await addReportSource(formData);
        setNewSourceName("");
        setNewSourceUrl("");
        setShowAddSource(false);
      } catch {
        setErrorKey("reports.addSourceFailed");
      }
    });
  }

  function handleDeleteSource(id: string) {
    setErrorKey(null);
    const formData = new FormData();
    formData.set("id", id);
    startManageSourcesTransition(async () => {
      try {
        await deleteReportSource(formData);
      } catch {
        setErrorKey("reports.deleteSourceFailed");
      }
    });
  }

  /**
   * Whether a fetched headline should still show under the current
   * severity/date filters — client-side only, narrows what is *displayed*
   * from what `fetchAllSourceHeadlines` already returned, so changing a
   * filter never needs a re-fetch. A headline with no detected date (most
   * of them, on several sources — see `headline-date.ts`) always passes the
   * date filter rather than being guessed out of range.
   */
  function isHeadlineVisible(headline: Headline): boolean {
    if (!meetsMinimumSeverity(headline.title, minSeverity)) return false;
    if (headline.date) {
      if (dateFrom && headline.date < dateFrom) return false;
      if (dateTo && headline.date > dateTo) return false;
    }
    return true;
  }

  function toggleHeadline(defaultRegion: Region, headline: { title: string; url: string }) {
    setCheckedHeadlines((prev) => {
      const next = new Map(prev);
      if (next.has(headline.url)) {
        next.delete(headline.url);
      } else {
        next.set(headline.url, { ...headline, region: defaultRegion });
      }
      return next;
    });
  }

  function setCheckedHeadlineRegion(url: string, region: Region) {
    setCheckedHeadlines((prev) => {
      const existing = prev.get(url);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(url, { ...existing, region });
      return next;
    });
  }

  /**
   * Fetches each checked story's own text and drops it straight into the
   * review panel as a ready-to-edit item — no `ANTHROPIC_API_KEY` required.
   * Appends to whatever is already in the review panel, same as
   * `handleAddManualItem`, so this can be combined with AI-drafted or
   * hand-written items in one report.
   */
  function handleUseSelectedHeadlines() {
    if (checkedHeadlines.size === 0) return;
    setErrorKey(null);
    startPullTransition(async () => {
      try {
        const items = await pullHeadlineItems(
          Array.from(checkedHeadlines.values()),
        );
        setDraftItems((prev) => [...(prev ?? []), ...items]);
        setCheckedHeadlines(new Map());
      } catch {
        setErrorKey("reports.pullFailed");
      }
    });
  }

  /**
   * The one-click path for "just this one": no checkbox, no batch button —
   * pull this single story straight into the review panel.
   */
  function handleUseOneHeadline(
    defaultRegion: Region,
    headline: { title: string; url: string },
  ) {
    setErrorKey(null);
    setPullingUrl(headline.url);
    startPullTransition(async () => {
      try {
        const items = await pullHeadlineItems([
          { ...headline, region: defaultRegion },
        ]);
        setDraftItems((prev) => [...(prev ?? []), ...items]);
      } catch {
        setErrorKey("reports.pullFailed");
      } finally {
        setPullingUrl(null);
      }
    });
  }

  /**
   * Opens the review panel with a blank item instead of an AI draft.
   *
   * The Claude-drafting step needs `ANTHROPIC_API_KEY`, which is optional —
   * a report is otherwise just the same structured text it always was, so an
   * operator without a key configured can still write items by hand, exactly
   * as before the console automated the writing. Mixing the two is fine:
   * this appends to whatever is already in the review panel, AI-drafted or
   * not.
   */
  function handleAddManualItem() {
    setErrorKey(null);
    setDraftItems((items) => [
      ...(items ?? []),
      { title: "", body: "", url: null, region: "KURDISTAN" },
    ]);
  }

  function updateDraftItem(index: number, patch: Partial<ReportNewsItem>) {
    setDraftItems((items) =>
      items
        ? items.map((item, i) => (i === index ? { ...item, ...patch } : item))
        : items,
    );
  }

  function handleSave() {
    if (!draftItems || draftItems.length === 0) return;
    setErrorKey(null);

    const formData = new FormData();
    formData.set("date", date);
    formData.set("kurdistanThreat", kurdistanThreat);
    formData.set("iraqThreat", iraqThreat);
    formData.set("politicalKurdistan", politicalKurdistan);
    formData.set("politicalIraq", politicalIraq);
    formData.set("weather", weather);
    for (const item of draftItems) {
      formData.append("finalTitle", item.title);
      formData.append("finalBody", item.body);
      formData.append("finalUrl", item.url ?? "");
      formData.append("finalRegion", item.region);
    }

    startTransition(async () => {
      try {
        await saveReport(formData);
        setDraftItems(null);
        setSources([newRow()]);
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 4000);
      } catch {
        setErrorKey("common.saveFailed");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", id);
      await deleteReport(formData);
    });
  }

  return (
    <div className="space-y-5">
      {!canGenerate && (
        <p className="border-status-elevated/40 bg-status-elevated/10 text-status-elevated border px-4 py-2 text-xs">
          {t("reports.previewNotice")}
        </p>
      )}

      {errorKey && (
        <p className="border-status-critical/40 bg-status-critical/10 text-status-critical border px-4 py-2 text-sm">
          {t(errorKey)}
        </p>
      )}

      {savedNotice && (
        <p className="border-status-clear/40 bg-status-clear/10 text-status-clear border px-4 py-2 text-xs">
          {t("reports.savedNotice")}
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {/* ---- sources --------------------------------------------------- */}
        <Panel
          label={t("reports.sources")}
          action={
            <span className="text-bone/56 text-xs">
              {t("reports.itemCount", { count: sources.length })}
            </span>
          }
        >
          <div className="space-y-4 p-5">
            {/*
             * Which sources the next fetch covers, and a jump-to-source link
             * for each. Selecting a story stays a human decision (see
             * `reports.ts`) — this only decides which front pages get
             * checked, same as the checklist below only decides which of
             * their stories get looked at.
             */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-1.5">
                {reportSources.map((source) => {
                  const isSelected = selectedSourceUrls.has(source.url);
                  return (
                    <span
                      key={source.url}
                      className={`flex items-center gap-1 border py-1 pe-1 ps-2 text-[11px] transition-colors ${
                        isSelected
                          ? "border-gold/40 text-gold"
                          : "border-bone/12 text-bone/40"
                      }`}
                    >
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSourceSelected(source.url)}
                          className="cursor-pointer"
                        />
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline"
                        >
                          {source.name}
                        </a>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleFetchOneSource(source.url)}
                        disabled={isFetchingHeadlines}
                        title={t("reports.fetchOnlyThis")}
                        className="text-bone/30 hover:text-gold cursor-pointer px-1 disabled:cursor-not-allowed"
                      >
                        ⟳
                      </button>
                      {source.custom && source.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSource(source.id!)}
                          disabled={isManagingSources}
                          title={t("common.delete")}
                          className="text-bone/30 hover:text-status-critical cursor-pointer px-1 disabled:cursor-not-allowed"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setShowAddSource((v) => !v)}
                  className="border-bone/12 text-bone/40 hover:border-gold hover:text-gold flex min-h-8 cursor-pointer items-center border px-2.5 text-[11px] transition-colors"
                >
                  {t("reports.addSourceButton")}
                </button>
              </div>

              {showAddSource && (
                <div className="border-bone/10 flex flex-wrap items-center gap-1.5 border p-2">
                  <input
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    placeholder={t("reports.newSourceName")}
                    className="border-bone/12 bg-ink/60 text-bone focus:border-gold min-h-8 flex-1 border px-2 text-xs outline-none"
                  />
                  <input
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    placeholder={t("reports.urlPlaceholder")}
                    dir="ltr"
                    className="border-bone/12 bg-ink/60 text-bone focus:border-gold min-h-8 flex-[2] border px-2 text-start text-xs outline-none"
                  />
                  <select
                    value={newSourceRegion}
                    onChange={(e) =>
                      setNewSourceRegion(e.target.value as Region)
                    }
                    className="border-bone/12 bg-ink/60 text-bone focus:border-gold min-h-8 cursor-pointer border px-2 text-xs outline-none"
                  >
                    {REGIONS.map((region) => (
                      <option key={region} value={region}>
                        {t(`reports.regions.${region}`)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddSource}
                    disabled={
                      isManagingSources || !newSourceName || !newSourceUrl
                    }
                    className="bg-gold text-ink hover:bg-gold-bright min-h-8 cursor-pointer px-3 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("reports.addSourceButton")}
                  </button>
                </div>
              )}
            </div>

            {/* ---- fetch today's headlines ------------------------------- */}
            <div className="border-bone/10 space-y-3 border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleFetchHeadlines}
                  disabled={isFetchingHeadlines || selectedSourceUrls.size === 0}
                  className="border-gold/40 text-gold hover:bg-gold hover:text-ink cursor-pointer border px-4 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isFetchingHeadlines
                    ? t("reports.fetchingHeadlines")
                    : t("reports.fetchHeadlines")}
                </button>
                {headlineGroups && (
                  <button
                    type="button"
                    onClick={() => {
                      setHeadlineGroups(null);
                      setCheckedHeadlines(new Map());
                    }}
                    className="text-bone/40 hover:text-gold ms-auto cursor-pointer text-xs transition-colors"
                  >
                    {t("common.hide")}
                  </button>
                )}
              </div>

              {headlineGroups && (
                <div className="flex flex-wrap items-end gap-3 text-xs">
                  <Field label={t("reports.minSeverity")}>
                    <select
                      value={minSeverity}
                      onChange={(e) =>
                        setMinSeverity(e.target.value as ThreatLevel)
                      }
                      className="border-bone/12 bg-ink/60 text-bone focus:border-gold cursor-pointer border px-2 py-1.5 text-xs outline-none"
                    >
                      {THREAT_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {t(`reports.threat.${level}`)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t("reports.dateFrom")}>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="border-bone/12 bg-ink/60 text-bone focus:border-gold border px-2 py-1.5 text-xs outline-none"
                    />
                  </Field>
                  <Field label={t("reports.dateTo")}>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="border-bone/12 bg-ink/60 text-bone focus:border-gold border px-2 py-1.5 text-xs outline-none"
                    />
                  </Field>
                  {(minSeverity !== "LOW" || dateFrom || dateTo) && (
                    <button
                      type="button"
                      onClick={() => {
                        setMinSeverity("LOW");
                        setDateFrom("");
                        setDateTo("");
                      }}
                      className="text-bone/40 hover:text-gold cursor-pointer text-xs transition-colors"
                    >
                      {t("reports.clearFilters")}
                    </button>
                  )}
                </div>
              )}

              {headlineGroups && (
                <>
                  <div className="max-h-96 space-y-4 overflow-y-auto">
                    {headlineGroups.map((group) => {
                      const visible = group.headlines.filter(isHeadlineVisible);
                      return (
                      <div key={group.name}>
                        <p className="text-gold/70 text-xs font-semibold">
                          {group.name}
                          {group.failed && group.headlines.length === 0 && (
                            <span className="text-bone/35 ms-2 font-normal">
                              {t("reports.sourceUnavailable")}
                            </span>
                          )}
                          {!group.failed &&
                            group.headlines.length > 0 &&
                            visible.length === 0 && (
                              <span className="text-bone/35 ms-2 font-normal">
                                {t("reports.hiddenByFilter")}
                              </span>
                            )}
                        </p>
                        <ul className="mt-1.5 space-y-1.5">
                          {visible.map((headline) => {
                            const checked = checkedHeadlines.get(headline.url);
                            return (
                              <li
                                key={headline.url}
                                className="flex items-start gap-2"
                              >
                                <input
                                  type="checkbox"
                                  checked={Boolean(checked)}
                                  onChange={() =>
                                    toggleHeadline(
                                      group.defaultRegion,
                                      headline,
                                    )
                                  }
                                  className="mt-1 min-h-4 min-w-4 cursor-pointer"
                                />
                                <span className="text-bone/70 flex-1 text-xs leading-snug">
                                  {headline.title}
                                </span>
                                {checked && (
                                  <select
                                    value={checked.region}
                                    onChange={(e) =>
                                      setCheckedHeadlineRegion(
                                        headline.url,
                                        e.target.value as Region,
                                      )
                                    }
                                    className="border-bone/12 bg-ink/60 text-gold/70 shrink-0 cursor-pointer border px-1.5 py-0.5 text-[10px] outline-none"
                                  >
                                    {REGIONS.map((region) => (
                                      <option key={region} value={region}>
                                        {t(`reports.regions.${region}`)}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUseOneHeadline(
                                      group.defaultRegion,
                                      headline,
                                    )
                                  }
                                  disabled={isPullingHeadlines}
                                  className="border-gold/30 text-gold/80 hover:bg-gold hover:text-ink shrink-0 cursor-pointer border px-1.5 py-0.5 text-[10px] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {pullingUrl === headline.url
                                    ? t("reports.pulling")
                                    : t("reports.useOne")}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleUseSelectedHeadlines}
                    disabled={checkedHeadlines.size === 0 || isPullingHeadlines}
                    className="bg-gold text-ink hover:bg-gold-bright w-full cursor-pointer px-4 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isPullingHeadlines
                      ? t("reports.pulling")
                      : t("reports.useSelected", {
                          count: checkedHeadlines.size,
                        })}
                  </button>
                </>
              )}
            </div>

            {sources.map((row, i) => (
              <div
                key={row.key}
                className="border-bone/14 space-y-2 border p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-bone/56 text-xs tabular-nums">
                    {i + 1}
                  </span>
                  <select
                    value={row.region}
                    onChange={(e) =>
                      updateSource(row.key, {
                        region: e.target.value as Region,
                      })
                    }
                    className="border-bone/16 bg-ink/60 text-bone focus:border-gold min-h-11 cursor-pointer border px-2 text-xs outline-none"
                  >
                    {REGIONS.map((region) => (
                      <option key={region} value={region}>
                        {t(`reports.regions.${region}`)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      setSources((rows) =>
                        rows.filter((r) => r.key !== row.key),
                      )
                    }
                    disabled={sources.length === 1}
                    className="text-bone/56 hover:text-status-critical ms-auto flex min-h-11 cursor-pointer items-center text-xs transition-colors disabled:pointer-events-none disabled:opacity-30"
                  >
                    {t("common.remove")}
                  </button>
                </div>

                {/* A URL is Latin and stays LTR whatever the console's language. */}
                <input
                  value={row.url}
                  dir="ltr"
                  onChange={(e) =>
                    updateSource(row.key, { url: e.target.value })
                  }
                  placeholder={t("reports.urlPlaceholder")}
                  autoComplete="off"
                  className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-start text-sm outline-none transition-colors"
                />
                <textarea
                  value={row.notes}
                  onChange={(e) =>
                    updateSource(row.key, { notes: e.target.value })
                  }
                  placeholder={t("reports.notesPlaceholder")}
                  rows={2}
                  className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full resize-y border px-3 py-2 text-sm outline-none transition-colors"
                />
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSources((rows) => [...rows, newRow()])}
                className="border-bone/26 text-bone/70 hover:border-gold hover:text-gold cursor-pointer border px-4 py-2 text-xs transition-colors"
              >
                {t("reports.addSource")}
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isPending || !canGenerate}
                className="bg-gold text-ink hover:bg-gold-bright ms-auto cursor-pointer px-5 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPending && !draftItems
                  ? t("reports.generating")
                  : t("reports.generate")}
              </button>
            </div>
          </div>
        </Panel>

        {/* ---- draft review ------------------------------------------------ */}
        <Panel label={t("reports.review")}>
          <div className="space-y-4 p-5">
            {!draftItems && (
<<<<<<< HEAD
              <p className="text-bone/50 text-sm">
                {t("reports.reviewEmpty")}
              </p>
=======
              <div className="space-y-3">
                <p className="text-bone/40 text-sm">
                  {t("reports.reviewEmpty")}
                </p>
                <button
                  type="button"
                  onClick={handleAddManualItem}
                  className="border-bone/20 text-bone/70 hover:border-gold hover:text-gold cursor-pointer border px-4 py-2 text-xs transition-colors"
                >
                  {t("reports.addManualItem")}
                </button>
              </div>
>>>>>>> c91932fdb4a1a5dc0fdf298e7b5c24a96d8791c1
            )}

            {draftItems && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("reports.date")}>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
                    />
                  </Field>
                  <Field label={t("reports.weather")}>
                    <input
                      value={weather}
                      onChange={(e) => setWeather(e.target.value)}
                      placeholder={t("reports.weatherPlaceholder")}
                      className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
                    />
                  </Field>
                  <Field label={t("reports.kurdistanThreat")}>
                    <select
                      value={kurdistanThreat}
                      onChange={(e) =>
                        setKurdistanThreat(e.target.value as ThreatLevel)
                      }
                      className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full cursor-pointer border px-3 py-2 text-xs outline-none"
                    >
                      {THREAT_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {t(`reports.threat.${level}`)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t("reports.iraqThreat")}>
                    <select
                      value={iraqThreat}
                      onChange={(e) =>
                        setIraqThreat(e.target.value as ThreatLevel)
                      }
                      className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full cursor-pointer border px-3 py-2 text-xs outline-none"
                    >
                      {THREAT_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {t(`reports.threat.${level}`)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t("reports.politicalKurdistan")}>
                    <input
                      value={politicalKurdistan}
                      onChange={(e) => setPoliticalKurdistan(e.target.value)}
                      className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
                    />
                  </Field>
                  <Field label={t("reports.politicalIraq")}>
                    <input
                      value={politicalIraq}
                      onChange={(e) => setPoliticalIraq(e.target.value)}
                      className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
                    />
                  </Field>
                </div>

                <div className="border-bone/12 space-y-3 border-t pt-4">
                  {draftItems.map((item, i) => (
                    <div
                      key={i}
                      className="border-bone/14 space-y-2 border p-3"
                    >
                      <div className="flex items-center gap-2">
<<<<<<< HEAD
                        <span className="text-gold/78 text-xs">
                          {t(`reports.regions.${item.region}`)}
                        </span>
=======
                        <select
                          value={item.region}
                          onChange={(e) =>
                            updateDraftItem(i, {
                              region: e.target.value as Region,
                            })
                          }
                          className="border-bone/12 bg-ink/60 text-gold/70 focus:border-gold cursor-pointer border px-2 py-1 text-xs outline-none"
                        >
                          {REGIONS.map((region) => (
                            <option key={region} value={region}>
                              {t(`reports.regions.${region}`)}
                            </option>
                          ))}
                        </select>
>>>>>>> c91932fdb4a1a5dc0fdf298e7b5c24a96d8791c1
                        <button
                          type="button"
                          onClick={() =>
                            setDraftItems((items) =>
                              items
                                ? items.filter((_, idx) => idx !== i)
                                : items,
                            )
                          }
                          className="text-bone/56 hover:text-status-critical ms-auto flex min-h-11 cursor-pointer items-center text-xs transition-colors"
                        >
                          {t("common.remove")}
                        </button>
                      </div>
                      <input
                        value={item.title}
                        onChange={(e) =>
                          updateDraftItem(i, { title: e.target.value })
                        }
                        className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm font-semibold outline-none transition-colors"
                      />
                      <textarea
                        value={item.body}
                        onChange={(e) =>
                          updateDraftItem(i, { body: e.target.value })
                        }
                        rows={4}
                        className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full resize-y border px-3 py-2 text-sm leading-relaxed outline-none transition-colors"
                      />
                      {item.url && (
                        <p dir="ltr" className="text-bone/56 truncate text-start text-xs">
                          {item.url}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

<<<<<<< HEAD
                <div className="border-bone/12 flex gap-2 border-t pt-4">
=======
                <button
                  type="button"
                  onClick={handleAddManualItem}
                  className="border-bone/20 text-bone/70 hover:border-gold hover:text-gold cursor-pointer border px-4 py-2 text-xs transition-colors"
                >
                  {t("reports.addManualItem")}
                </button>

                <div className="border-bone/8 flex gap-2 border-t pt-4">
>>>>>>> c91932fdb4a1a5dc0fdf298e7b5c24a96d8791c1
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending || !canGenerate}
                    className="bg-gold text-ink hover:bg-gold-bright cursor-pointer px-5 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isPending
                      ? t("common.saving")
                      : t("reports.saveReport")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftItems(null)}
                    className="border-bone/26 text-bone/70 hover:border-gold hover:text-gold cursor-pointer border px-4 py-2 text-xs transition-colors"
                  >
                    {t("reports.discard")}
                  </button>
                </div>
              </>
            )}
          </div>
        </Panel>
      </div>

      {/* ---- history ------------------------------------------------------ */}
      <Panel label={t("reports.history")}>
        <ul className="divide-bone/6 divide-y">
          {reports.length === 0 && (
            <li className="text-bone/50 px-4 py-6 text-sm">
              {t("reports.historyEmpty")}
            </li>
          )}
          {reports.map((report) => (
            <li
              key={report.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <span className="text-bone/85 flex-1 text-sm">
                {formatDate(new Date(report.date), locale, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span className="text-bone/50 text-xs">
                {t("reports.itemCount", {
                  count: report.content.items.length,
                })}
              </span>
              <span className="text-bone/56 text-xs">
                {t("reports.threatSummary", {
                  kurdistan: t(`reports.threat.${report.kurdistanThreat}`),
                  iraq: t(`reports.threat.${report.iraqThreat}`),
                })}
              </span>
              {report.createdByName && (
                <span className="text-bone/56 hidden text-xs sm:inline">
                  {report.createdByName}
                </span>
              )}
              <a
                href={`/api/admin/reports/${report.id}/pdf`}
                className="border-gold/40 text-gold hover:bg-gold hover:text-ink flex min-h-11 cursor-pointer items-center border px-3 text-xs transition-colors"
              >
                {t("reports.downloadPdf")}
              </a>
              <button
                type="button"
                onClick={() => handleDelete(report.id)}
                disabled={isPending}
                className="border-status-critical/40 text-status-critical hover:bg-status-critical hover:text-ink flex min-h-11 cursor-pointer items-center border px-3 text-xs transition-colors disabled:opacity-40"
              >
                {t("common.delete")}
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-bone/55 mb-1.5 block text-xs">
        {label}
      </span>
      {children}
    </label>
  );
}
