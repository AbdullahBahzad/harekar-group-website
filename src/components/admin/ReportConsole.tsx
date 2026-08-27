"use client";

import { useState, useTransition } from "react";
import Panel from "@/components/admin/Panel";
import {
  generateReportDraft,
  saveReport,
  deleteReport,
} from "@/app/[locale]/admin/sources/actions";
/*
 * From `report-shape`, not `reports`: this is a client component, and
 * `reports.ts` reaches for `node:dns` and the Anthropic SDK at import time.
 */
import { REGIONS, THREAT_LEVELS } from "@/lib/report-shape";
import type {
  Region,
  ReportContent,
  ReportNewsItem,
  ThreatLevel,
} from "@/lib/report-shape";

export type ConsoleReport = {
  id: string;
  date: string;
  kurdistanThreat: ThreatLevel;
  iraqThreat: ThreatLevel;
  politicalKurdistan: string | null;
  politicalIraq: string | null;
  weather: string | null;
  content: ReportContent;
  createdAt: string;
  createdByName: string | null;
};

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
}: {
  reports: ConsoleReport[];
  canGenerate: boolean;
}) {
  const [sources, setSources] = useState<SourceRow[]>([newRow()]);
  const [draftItems, setDraftItems] = useState<ReportNewsItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [isPending, startTransition] = useTransition();

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
    setError(null);
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generation failed");
      }
    });
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
    setError(null);

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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
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
          Preview — reports cannot be generated or saved without a database
          connection.
        </p>
      )}

      {error && (
        <p className="border-status-critical/40 bg-status-critical/10 text-status-critical border px-4 py-2 text-sm">
          {error}
        </p>
      )}

      {savedNotice && (
        <p className="border-status-clear/40 bg-status-clear/10 text-status-clear border px-4 py-2 text-xs">
          Report saved.
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {/* ---- sources --------------------------------------------------- */}
        <Panel
          label="Sources"
          action={
            <span className="text-bone/30 text-xs">
              {sources.length} item{sources.length === 1 ? "" : "s"}
            </span>
          }
        >
          <div className="space-y-4 p-5">
            {sources.map((row, i) => (
              <div
                key={row.key}
                className="border-bone/10 space-y-2 border p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-bone/30 text-xs tabular-nums">
                    {i + 1}
                  </span>
                  <select
                    value={row.region}
                    onChange={(e) =>
                      updateSource(row.key, {
                        region: e.target.value as Region,
                      })
                    }
                    className="border-bone/12 bg-ink/60 text-bone focus:border-gold cursor-pointer border px-2 py-1 text-xs outline-none"
                  >
                    {REGIONS.map((region) => (
                      <option key={region} value={region}>
                        {region === "KURDISTAN" ? "Kurdistan" : "Iraq wide"}
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
                    className="text-bone/30 hover:text-status-critical ms-auto cursor-pointer text-xs transition-colors disabled:pointer-events-none disabled:opacity-30"
                  >
                    Remove
                  </button>
                </div>

                <input
                  value={row.url}
                  onChange={(e) =>
                    updateSource(row.key, { url: e.target.value })
                  }
                  placeholder="https://…"
                  autoComplete="off"
                  className="border-bone/12 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
                />
                <textarea
                  value={row.notes}
                  onChange={(e) =>
                    updateSource(row.key, { notes: e.target.value })
                  }
                  placeholder="Or paste the raw text here instead of a link"
                  rows={2}
                  className="border-bone/12 bg-ink/60 text-bone focus:border-gold w-full resize-y border px-3 py-2 text-sm outline-none transition-colors"
                />
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSources((rows) => [...rows, newRow()])}
                className="border-bone/20 text-bone/70 hover:border-gold hover:text-gold cursor-pointer border px-4 py-2 text-xs transition-colors"
              >
                + Add source
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isPending || !canGenerate}
                className="bg-gold text-ink hover:bg-gold-bright ms-auto cursor-pointer px-5 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPending && !draftItems ? "Drafting…" : "Generate draft"}
              </button>
            </div>
          </div>
        </Panel>

        {/* ---- draft review ------------------------------------------------ */}
        <Panel label="Review & publish">
          <div className="space-y-4 p-5">
            {!draftItems && (
              <p className="text-bone/40 text-sm">
                Add sources and generate a draft to review it here.
              </p>
            )}

            {draftItems && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="border-bone/12 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
                    />
                  </Field>
                  <Field label="Weather">
                    <input
                      value={weather}
                      onChange={(e) => setWeather(e.target.value)}
                      placeholder="e.g. Clear, 38°C"
                      className="border-bone/12 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
                    />
                  </Field>
                  <Field label="Kurdistan threat level">
                    <select
                      value={kurdistanThreat}
                      onChange={(e) =>
                        setKurdistanThreat(e.target.value as ThreatLevel)
                      }
                      className="border-bone/12 bg-ink/60 text-bone focus:border-gold w-full cursor-pointer border px-3 py-2 text-xs outline-none"
                    >
                      {THREAT_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Iraq wide threat level">
                    <select
                      value={iraqThreat}
                      onChange={(e) =>
                        setIraqThreat(e.target.value as ThreatLevel)
                      }
                      className="border-bone/12 bg-ink/60 text-bone focus:border-gold w-full cursor-pointer border px-3 py-2 text-xs outline-none"
                    >
                      {THREAT_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Political situation — Kurdistan">
                    <input
                      value={politicalKurdistan}
                      onChange={(e) => setPoliticalKurdistan(e.target.value)}
                      className="border-bone/12 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
                    />
                  </Field>
                  <Field label="Political situation — Iraq wide">
                    <input
                      value={politicalIraq}
                      onChange={(e) => setPoliticalIraq(e.target.value)}
                      className="border-bone/12 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
                    />
                  </Field>
                </div>

                <div className="border-bone/8 space-y-3 border-t pt-4">
                  {draftItems.map((item, i) => (
                    <div
                      key={i}
                      className="border-bone/10 space-y-2 border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gold/70 text-xs">
                          {item.region === "KURDISTAN"
                            ? "Kurdistan"
                            : "Iraq wide"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setDraftItems((items) =>
                              items
                                ? items.filter((_, idx) => idx !== i)
                                : items,
                            )
                          }
                          className="text-bone/30 hover:text-status-critical ms-auto cursor-pointer text-xs transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        value={item.title}
                        onChange={(e) =>
                          updateDraftItem(i, { title: e.target.value })
                        }
                        className="border-bone/12 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm font-semibold outline-none transition-colors"
                      />
                      <textarea
                        value={item.body}
                        onChange={(e) =>
                          updateDraftItem(i, { body: e.target.value })
                        }
                        rows={4}
                        className="border-bone/12 bg-ink/60 text-bone focus:border-gold w-full resize-y border px-3 py-2 text-sm leading-relaxed outline-none transition-colors"
                      />
                      {item.url && (
                        <p className="text-bone/30 truncate text-xs">
                          {item.url}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="border-bone/8 flex gap-2 border-t pt-4">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending || !canGenerate}
                    className="bg-gold text-ink hover:bg-gold-bright cursor-pointer px-5 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isPending ? "Saving…" : "Save report"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftItems(null)}
                    className="border-bone/20 text-bone/70 hover:border-gold hover:text-gold cursor-pointer border px-4 py-2 text-xs transition-colors"
                  >
                    Discard
                  </button>
                </div>
              </>
            )}
          </div>
        </Panel>
      </div>

      {/* ---- history ------------------------------------------------------ */}
      <Panel label="History">
        <ul className="divide-bone/6 divide-y">
          {reports.length === 0 && (
            <li className="text-bone/40 px-4 py-6 text-sm">
              No reports yet.
            </li>
          )}
          {reports.map((report) => (
            <li
              key={report.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <span className="text-bone/85 flex-1 text-sm">
                {new Date(report.date).toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span className="text-bone/40 text-xs">
                {report.content.items.length} item
                {report.content.items.length === 1 ? "" : "s"}
              </span>
              <span className="text-bone/30 text-xs">
                KRI {report.kurdistanThreat} · IRQ {report.iraqThreat}
              </span>
              {report.createdByName && (
                <span className="text-bone/30 hidden text-xs sm:inline">
                  {report.createdByName}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleDelete(report.id)}
                disabled={isPending}
                className="border-status-critical/40 text-status-critical hover:bg-status-critical hover:text-ink cursor-pointer border px-3 py-1.5 text-xs transition-colors disabled:opacity-40"
              >
                Delete
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
      <span className="text-bone/45 mb-1.5 block text-xs">
        {label}
      </span>
      {children}
    </label>
  );
}
