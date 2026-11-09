"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { severityColor } from "@/data/iraq";
import type { LeafletArea, LeafletPin } from "@/components/IraqLeafletMap";
import type { PortalIncident } from "@/lib/portal/incidents";
import type { GovernorateKey } from "@/lib/report-shape";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

// Leaflet touches `window` at import time.
const IraqLeafletMap = dynamic(() => import("@/components/IraqLeafletMap"), { ssr: false });

/** A governorate the reader can switch on as a tactical area. */
export type ConsoleArea = { key: GovernorateKey; name: string; rings: [number, number][][] };

const RANGES = ["7", "14", "30", "60", "all"] as const;
type Range = (typeof RANGES)[number];
const DAY = 86_400_000;
const PAGE_SIZE = 12;
/** The shade a switched-on tactical area takes on the map. */
const AREA_TONE = "#4ba07a";

const toneFor = (severity: PortalIncident["severity"]) =>
  severityColor[severity.toLowerCase() as keyof typeof severityColor];

const SEVERITIES = ["CRITICAL", "ELEVATED", "CLEAR"] as const;
/** Incidents at (near enough) the same spot share one pin and one key. */
const spotKeyOf = (incident: PortalIncident) =>
  `${incident.latitude.toFixed(2)},${incident.longitude.toFixed(2)}`;

/**
 * The client portal's live operational picture.
 *
 * Every control narrows the same list: the date range, and the tactical areas
 * — governorates switched on from the panel over the map, each shaded on the
 * map, the view moving to frame them, and only incidents inside them counted.
 * The map and the feed are two views of that one filtered list.
 */
export default function ConsoleView({
  incidents,
  areas,
  now,
}: {
  incidents: PortalIncident[];
  areas: ConsoleArea[];
  now: number;
}) {
  const t = useTranslations("portal.console");
  const tSeverity = useTranslations("intelligence.severity");
  const locale = useLocale();

  const [range, setRange] = useState<Range>("30");
  const [view, setView] = useState<"map" | "feed">("map");
  const [selected, setSelected] = useState<GovernorateKey[]>([]);
  const [panelOpen, setPanelOpen] = useState(true);
  const [spot, setSpot] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  // Advanced filters: which severities to show, and one category or all.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [severities, setSeverities] = useState<PortalIncident["severity"][]>([...SEVERITIES]);
  const [category, setCategory] = useState<string>("ALL");
  const categories = useMemo(
    () =>
      [...new Set(incidents.map((incident) => incident.category).filter((c): c is string => Boolean(c)))].sort(),
    [incidents],
  );
  const filtersActive = severities.length < SEVERITIES.length || category !== "ALL";

  const names = useMemo(() => new Map(areas.map((a) => [a.key, a.name])), [areas]);

  const filtered = useMemo(
    () =>
      incidents.filter((incident) => {
        if (range !== "all" && Date.parse(incident.occurredAt) < now - Number(range) * DAY) return false;
        if (!severities.includes(incident.severity)) return false;
        if (category !== "ALL" && incident.category !== category) return false;
        if (selected.length > 0) return incident.governorate !== null && selected.includes(incident.governorate);
        return true;
      }),
    [incidents, range, selected, now, severities, category],
  );

  /*
   * Incidents at the same spot share one pin with a count, the way the
   * public map groups them — otherwise ten reports from one checkpoint would
   * stack into a single unreadable dot.
   */
  const spots = useMemo(() => {
    const groups = new Map<string, PortalIncident[]>();
    for (const incident of filtered) {
      const key = spotKeyOf(incident);
      groups.set(key, [...(groups.get(key) ?? []), incident]);
    }
    return groups;
  }, [filtered]);

  const pins: LeafletPin[] = useMemo(
    () =>
      [...spots.entries()].map(([key, group]) => {
        const worst = group.some((i) => i.severity === "CRITICAL")
          ? "CRITICAL"
          : group.some((i) => i.severity === "ELEVATED")
            ? "ELEVATED"
            : "CLEAR";
        return {
          id: key,
          lat: group[0].latitude,
          lng: group[0].longitude,
          tone: toneFor(worst),
          ring: worst !== "CLEAR",
          count: group.length,
          selected: spot === key,
          onClick: () => setSpot((current) => (current === key ? null : key)),
        };
      }),
    [spots, spot],
  );

  const shaded: LeafletArea[] = useMemo(
    () =>
      areas
        .filter((area) => selected.includes(area.key))
        .map((area) => ({ id: area.key, rings: area.rings, tone: AREA_TONE })),
    [areas, selected],
  );

  const spotIncidents = spot ? (spots.get(spot) ?? []) : [];
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);

  const formatWhen = (iso: string) =>
    new Date(iso).toLocaleString(locale === "en" ? "en-GB" : locale, {
      // Iraq's own clock — a reader in Duhok should not see Virginia's hour.
      timeZone: "Asia/Baghdad",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  function toggleArea(key: GovernorateKey) {
    setSpot(null);
    setPage(0);
    setSelected((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: range on one side, the count and the view switch on the other. */}
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setRange(value);
              setSpot(null);
              setPage(0);
            }}
            aria-pressed={range === value}
            className={cn(
              "min-h-9 cursor-pointer rounded-full border px-3.5 text-xs transition-colors",
              range === value
                ? "border-gold bg-gold/15 text-gold"
                : "border-bone/16 text-bone/65 hover:border-gold/50 hover:text-bone",
            )}
          >
            {t(`ranges.${value}`)}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          className={cn(
            "flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-xs transition-colors",
            filtersOpen || filtersActive
              ? "border-gold bg-gold/15 text-gold"
              : "border-bone/16 text-bone/65 hover:border-gold/50 hover:text-bone",
          )}
        >
          <svg viewBox="0 0 20 20" className="size-3.5" fill="none" aria-hidden>
            <path d="M3 5h14M6 10h8M8.5 15h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {t("advancedFilters")}
          {filtersActive && <span aria-hidden className="bg-status-clear size-1.5 rounded-full" />}
        </button>
        <span className="flex-1" />

        <span className="border-status-clear/40 text-status-clear rounded-full border px-3 py-1 text-xs tabular-nums">
          {t("count", { count: filtered.length })}
        </span>
        <div className="border-bone/16 flex rounded-full border p-0.5" role="group" aria-label={t("viewLabel")}>
          {(["map", "feed"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              aria-pressed={view === value}
              className={cn(
                "min-h-8 cursor-pointer rounded-full px-4 text-xs transition-colors",
                view === value ? "bg-gold text-ink" : "text-bone/65 hover:text-bone",
              )}
            >
              {t(value)}
            </button>
          ))}
        </div>
      </div>

      {filtersOpen && (
        <div className="border-bone/14 bg-surface/20 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-bone/55 text-[11px] tracking-[0.14em] uppercase">{t("severity")}</span>
            {SEVERITIES.map((level) => {
              const on = severities.includes(level);
              return (
                <button
                  key={level}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setPage(0);
                    setSpot(null);
                    setSeverities((current) =>
                      on ? current.filter((s) => s !== level) : [...current, level],
                    );
                  }}
                  className={cn(
                    "flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs transition-colors",
                    on ? "border-bone/30 text-bone" : "border-bone/12 text-bone/40",
                  )}
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ background: toneFor(level), opacity: on ? 1 : 0.35 }}
                  />
                  {tSeverity(level.toLowerCase())}
                </button>
              );
            })}
          </div>
          <label className="flex items-center gap-2">
            <span className="text-bone/55 text-[11px] tracking-[0.14em] uppercase">{t("category")}</span>
            <select
              value={category}
              onChange={(e) => {
                setPage(0);
                setSpot(null);
                setCategory(e.target.value);
              }}
              className="border-bone/16 bg-ink/60 text-bone focus:border-gold min-h-8 cursor-pointer rounded-full border px-3 text-xs outline-none"
            >
              <option value="ALL">{t("allCategories")}</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {filtersActive && (
            <button
              type="button"
              onClick={() => {
                setSeverities([...SEVERITIES]);
                setCategory("ALL");
                setPage(0);
              }}
              className="text-gold hover:text-gold-bright cursor-pointer text-xs"
            >
              {t("resetFilters")}
            </button>
          )}
        </div>
      )}

      {view === "map" ? (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="border-bone/14 bg-surface/20 relative overflow-hidden rounded-2xl border">
          <div className="h-[34rem] sm:h-[38rem]">
            <IraqLeafletMap
              markers={pins}
              areas={shaded}
              // The Tactical areas panel sits over the map's start edge.
              areaPadding={{ start: panelOpen ? 250 : 0 }}
              maskOutside
              ariaLabel={t("mapLabel")}
              className="h-full"
            />
          </div>

          {/* Tactical areas: a governorate per switch, over the map's corner. */}
          <div className="absolute start-3 top-3 z-[500] w-60">
            <button
              type="button"
              onClick={() => setPanelOpen((open) => !open)}
              aria-expanded={panelOpen}
              className="border-bone/16 bg-ink/85 text-bone/85 hover:border-gold/50 flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-xs backdrop-blur"
            >
              <svg viewBox="0 0 20 20" className="size-3.5" fill="none" aria-hidden>
                <path d="M3 5.5 7.5 3.5l5 2 4.5-2v11l-4.5 2-5-2L3 16.5v-11Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              {t("tacticalAreas")}
              {selected.length > 0 && (
                <span className="bg-status-clear text-ink flex size-4 items-center justify-center rounded-full text-[10px] font-bold tabular-nums">
                  {selected.length}
                </span>
              )}
            </button>

            {panelOpen && (
              <div className="border-bone/14 bg-ink/92 mt-2 overflow-hidden rounded-xl border backdrop-blur">
                <div className="border-bone/10 flex items-center justify-between border-b px-3 py-2">
                  <span className="text-bone/55 text-[10px] tracking-[0.18em] uppercase">{t("tacticalAreas")}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected([]);
                      setSpot(null);
                    }}
                    disabled={selected.length === 0}
                    className="text-gold hover:text-gold-bright cursor-pointer text-xs disabled:cursor-default disabled:opacity-40"
                  >
                    {t("clear")}
                  </button>
                </div>
                <ul className="max-h-64 overflow-y-auto py-1">
                  {areas.map((area) => {
                    const on = selected.includes(area.key);
                    return (
                      <li key={area.key}>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          onClick={() => toggleArea(area.key)}
                          className={cn(
                            "flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-start text-sm transition-colors",
                            on ? "bg-status-clear/10 text-bone" : "text-bone/75 hover:bg-bone/5",
                          )}
                        >
                          {area.name}
                          {/* The switch itself — position and colour, not colour alone. */}
                          <span
                            aria-hidden
                            className={cn(
                              "relative h-4 w-7 shrink-0 rounded-full transition-colors",
                              on ? "bg-status-clear" : "bg-bone/20",
                            )}
                          >
                            <span
                              className={cn(
                                "bg-bone absolute top-0.5 size-3 rounded-full transition-all",
                                on ? "end-0.5" : "start-0.5",
                              )}
                            />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* The incidents at a clicked pin. */}
          {spotIncidents.length > 0 && (
            <aside className="border-bone/14 bg-ink/94 absolute end-3 top-3 bottom-3 z-[500] flex w-80 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-xl border backdrop-blur">
              <div className="border-bone/10 flex items-center justify-between border-b px-4 py-3">
                <p className="text-bone text-sm font-medium">{t("atLocation", { count: spotIncidents.length })}</p>
                <button
                  type="button"
                  onClick={() => setSpot(null)}
                  aria-label={t("close")}
                  className="text-bone/50 hover:text-bone flex size-8 cursor-pointer items-center justify-center rounded-full"
                >
                  ×
                </button>
              </div>
              <ul className="flex-1 space-y-3 overflow-y-auto p-4">
                {spotIncidents.map((incident) => (
                  <IncidentCard
                    key={incident.id}
                    incident={incident}
                    labels={{
                      reliability: incident.sourceReliability
                        ? t(`reliability.${incident.sourceReliability}`)
                        : null,
                      credibility: incident.infoCredibility
                        ? t(`credibility.${incident.infoCredibility}`)
                        : null,
                      sourceReliability: t("sourceReliability"),
                      infoReliability: t("infoReliability"),
                      source: t("sourceDocumentation"),
                      fullReport: t("viewFullReport"),
                    }}
                    severityLabel={tSeverity(incident.severity.toLowerCase())}
                    area={incident.governorate ? names.get(incident.governorate) : undefined}
                    when={formatWhen(incident.occurredAt)}
                  />
                ))}
              </ul>
            </aside>
          )}
        </div>

        {/* Conterra's side list: the same filtered incidents, paged, beside
            the map. Picking one opens its spot on the map. */}
        <div className="border-bone/14 bg-surface/20 flex flex-col overflow-hidden rounded-2xl border xl:h-[38rem]">
          <div className="border-bone/10 flex items-center gap-2 border-b px-4 py-3 text-[11px] tracking-[0.12em] uppercase">
            <span className="text-bone/85">{t("feedTitle")}</span>
            <span className="text-bone/40">·</span>
            <span className="text-bone/55 min-w-0 flex-1 truncate">
              {selected.length > 0 ? selected.map((key) => names.get(key)).join(", ") : t("nationwide")}
            </span>
            <span className="text-status-clear shrink-0 tabular-nums">{t("count", { count: filtered.length })}</span>
          </div>
          {filtered.length === 0 ? (
            <p className="text-bone/55 px-4 py-10 text-center text-sm">{t("empty")}</p>
          ) : (
            <>
              <ul className="divide-bone/8 flex-1 divide-y overflow-y-auto">
                {filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map((incident) => {
                  const key = spotKeyOf(incident);
                  return (
                    <li key={incident.id}>
                      <button
                        type="button"
                        onClick={() => setSpot(key)}
                        aria-pressed={spot === key}
                        className={cn(
                          "w-full cursor-pointer px-4 py-3 text-start transition-colors",
                          spot === key ? "bg-gold/10" : "hover:bg-bone/[0.04]",
                        )}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <SeverityTag severity={incident.severity} label={tSeverity(incident.severity.toLowerCase())} />
                          <span className="text-bone/45 text-[11px] tabular-nums">{formatWhen(incident.occurredAt)}</span>
                        </span>
                        <span className="text-bone mt-1.5 block text-sm leading-snug">{incident.headline ?? incident.label}</span>
                        <span className="text-bone/45 mt-0.5 block text-xs">
                          {[incident.city, incident.governorate ? names.get(incident.governorate) : incident.province]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="border-bone/10 flex items-center justify-between border-t px-4 py-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="text-bone/70 hover:text-gold min-h-9 cursor-pointer px-2 disabled:cursor-default disabled:opacity-30"
                >
                  {t("previous")}
                </button>
                <span className="text-bone/50 tabular-nums">{t("page", { page: currentPage + 1, pages })}</span>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(pages - 1, currentPage + 1))}
                  disabled={currentPage >= pages - 1}
                  className="text-bone/70 hover:text-gold min-h-9 cursor-pointer px-2 disabled:cursor-default disabled:opacity-30"
                >
                  {t("next")}
                </button>
              </div>
            </>
          )}
        </div>
        </div>
      ) : (
        <div className="border-bone/14 bg-surface/20 overflow-hidden rounded-2xl border">
          <div className="border-bone/10 flex items-center gap-2 border-b px-4 py-3 text-xs">
            <span className="text-bone/85">{t("feedTitle")}</span>
            <span className="text-bone/40">·</span>
            <span className="text-bone/55">
              {selected.length > 0 ? selected.map((key) => names.get(key)).join(", ") : t("nationwide")}
            </span>
          </div>
          {filtered.length === 0 ? (
            <p className="text-bone/55 px-4 py-10 text-center text-sm">{t("empty")}</p>
          ) : (
            <>
              <ul className="divide-bone/8 divide-y">
                {filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map((incident) => (
                  <li key={incident.id} className="px-4 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <SeverityTag severity={incident.severity} label={tSeverity(incident.severity.toLowerCase())} />
                      <span className="text-bone/50 text-xs tabular-nums">{formatWhen(incident.occurredAt)}</span>
                    </div>
                    <p className="text-bone mt-2 text-sm leading-snug">{incident.headline ?? incident.label}</p>
                    <p className="text-bone/50 mt-1 text-xs">
                      {[incident.city, incident.governorate ? names.get(incident.governorate) : incident.province]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="border-bone/10 flex items-center justify-between border-t px-4 py-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="text-bone/70 hover:text-gold min-h-9 cursor-pointer px-2 disabled:cursor-default disabled:opacity-30"
                >
                  {t("previous")}
                </button>
                <span className="text-bone/50 tabular-nums">{t("page", { page: currentPage + 1, pages })}</span>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(pages - 1, currentPage + 1))}
                  disabled={currentPage >= pages - 1}
                  className="text-bone/70 hover:text-gold min-h-9 cursor-pointer px-2 disabled:cursor-default disabled:opacity-30"
                >
                  {t("next")}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SeverityTag({ severity, label }: { severity: PortalIncident["severity"]; label: string }) {
  return (
    <span
      className="rounded border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase"
      style={{ color: toneFor(severity), borderColor: `color-mix(in oklab, ${toneFor(severity)} 55%, transparent)` }}
    >
      {label}
    </span>
  );
}

function IncidentCard({
  incident,
  severityLabel,
  area,
  when,
  labels,
}: {
  incident: PortalIncident;
  severityLabel: string;
  area?: string;
  when: string;
  labels: {
    reliability: string | null;
    credibility: string | null;
    sourceReliability: string;
    infoReliability: string;
    source: string;
    fullReport: string;
  };
}) {
  return (
    <li className="border-bone/12 rounded-lg border p-3">
      <ul className="text-bone/60 space-y-1 text-[11px]">
        <li>{when}</li>
        <li dir="ltr" className="text-start tabular-nums">
          {incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}
        </li>
        {(incident.city || area) && <li>{[incident.city, area].filter(Boolean).join(", ")}</li>}
      </ul>

      <div className="mt-3 flex flex-col gap-2">
        {incident.sourceUrl && (
          <a
            href={incident.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-status-clear/85 text-ink hover:bg-status-clear flex min-h-9 items-center justify-center rounded-lg text-xs font-medium transition-colors"
          >
            {labels.source}
          </a>
        )}
        <Link
          href={`/portal/incidents/${incident.id}`}
          className="bg-bone text-ink hover:bg-bone/85 flex min-h-9 items-center justify-center rounded-lg text-xs font-semibold tracking-[0.12em] uppercase transition-colors"
        >
          {labels.fullReport}
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SeverityTag severity={incident.severity} label={severityLabel} />
        {incident.category && <span className="text-bone/55 text-[10px] tracking-wide uppercase">{incident.category}</span>}
      </div>
      <p className="text-bone mt-2 text-sm leading-snug font-medium">{incident.headline ?? incident.label}</p>
      {incident.body && <p className="text-bone/65 mt-1.5 line-clamp-4 text-xs leading-relaxed">{incident.body}</p>}

      {(labels.reliability || labels.credibility) && (
        <dl className="border-bone/10 mt-3 space-y-1 border-t pt-2 text-[11px]">
          {labels.reliability && (
            <div className="flex justify-between gap-3">
              <dt className="text-bone/50 uppercase">{labels.sourceReliability}</dt>
              <dd className="text-status-clear text-end">{labels.reliability}</dd>
            </div>
          )}
          {labels.credibility && (
            <div className="flex justify-between gap-3">
              <dt className="text-bone/50 uppercase">{labels.infoReliability}</dt>
              <dd className="text-status-elevated text-end">{labels.credibility}</dd>
            </div>
          )}
        </dl>
      )}
    </li>
  );
}
