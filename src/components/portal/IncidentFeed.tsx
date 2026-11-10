"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { PortalIncident } from "@/lib/portal/incidents";
import { formatDate } from "@/lib/portal/format";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

type SeverityFilter = "ALL" | "CLEAR" | "ELEVATED" | "CRITICAL";

const DAY = 86_400_000;
const RANGES = ["1", "7", "30", "90", "all", "custom"] as const;
const SEVERITY_RANK: Record<PortalIncident["severity"], number> = { CLEAR: 0, ELEVATED: 1, CRITICAL: 2 };

type Filters = {
  query: string;
  severity: SeverityFilter;
  /** A `GovernorateKey`, worked out from the incident's position. */
  governorate: string;
  category: string;
  method: string;
  range: (typeof RANGES)[number];
  /** `YYYY-MM-DD`, used when `range` is "custom". */
  from: string;
  to: string;
  status: "all" | "open" | "resolved";
  sort: "newest" | "oldest" | "severity";
  /** When the period was chosen: "last 7 days" counts back from here. */
  anchor: number;
};

const severityColor: Record<PortalIncident["severity"], string> = {
  CLEAR: "var(--color-status-clear)",
  ELEVATED: "var(--color-status-elevated)",
  CRITICAL: "var(--color-status-critical)",
};

/**
 * Every published incident, filterable by text, severity, governorate,
 * category, method, period and status, and sortable — the
 * structured log Conterra calls the "Incident Feed", drawn straight from the
 * same `IntelMarker` rows the analyst console and the public map already
 * carry the category/method/actor/target detail on.
 */
export default function IncidentFeed({
  incidents,
}: {
  incidents: PortalIncident[];
}) {
  const t = useTranslations("portal.incidents");
  const tSeverity = useTranslations("intelligence.severity");
  const locale = useLocale();

  const tVocab = useTranslations("reportVocab");
  const empty: Filters = {
    query: "",
    severity: "ALL",
    governorate: "",
    category: "",
    method: "",
    range: "all",
    from: "",
    to: "",
    status: "all",
    sort: "newest",
    anchor: 0,
  };
  const [filters, setFilters] = useState<Filters>(empty);
  const set = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch }));
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const options = useMemo(() => {
    const values = (pick: (incident: PortalIncident) => string | null) =>
      [...new Set(incidents.map(pick).filter((v): v is string => Boolean(v)))].sort();
    return {
      governorates: values((incident) => incident.governorate),
      categories: values((incident) => incident.category),
      methods: values((incident) => incident.method),
    };
  }, [incidents]);

  const filtered = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    // "Last 7 days" counts back from when the reader picked the period
    // (stored with it), so the list does not shift between renders.
    const now = filters.anchor;
    const since =
      filters.range === "custom"
        ? filters.from
          ? Date.parse(`${filters.from}T00:00:00`)
          : -Infinity
        : filters.range === "all"
          ? -Infinity
          : now - Number(filters.range) * DAY;
    const until =
      filters.range === "custom" && filters.to ? Date.parse(`${filters.to}T23:59:59`) : Infinity;

    const rows = incidents.filter((incident) => {
      const at = Date.parse(incident.occurredAt);
      if (at < since || at > until) return false;
      if (filters.severity !== "ALL" && incident.severity !== filters.severity) return false;
      if (filters.governorate && incident.governorate !== filters.governorate) return false;
      if (filters.category && incident.category !== filters.category) return false;
      if (filters.method && incident.method !== filters.method) return false;
      if (filters.status === "open" && incident.resolved) return false;
      if (filters.status === "resolved" && !incident.resolved) return false;
      if (query) {
        const haystack = [
          incident.headline,
          incident.label,
          incident.body,
          incident.city,
          incident.province,
          incident.actor,
          incident.target,
          incident.category,
          incident.method,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    return rows.sort((a, b) => {
      if (filters.sort === "severity") {
        const rank = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
        if (rank !== 0) return rank;
      }
      const order = Date.parse(b.occurredAt) - Date.parse(a.occurredAt);
      return filters.sort === "oldest" ? -order : order;
    });
  }, [incidents, filters]);

  const active = JSON.stringify({ ...filters, anchor: 0 }) !== JSON.stringify(empty);
  const control =
    "border-bone/16 bg-white text-bone focus:border-gold min-h-11 w-full cursor-pointer rounded-xl border px-3 text-sm outline-none";
  const label = "text-bone/55 mb-1 block text-[11px] tracking-[0.14em] uppercase";

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-bone text-3xl font-light">
          {t("title")}
        </h1>
        <p className="text-bone/55 mt-2 max-w-2xl text-sm leading-relaxed">
          {t("intro")}
        </p>
      </header>

      <section
        aria-label={t("filters")}
        className="border-bone/14 bg-surface/40 mb-6 space-y-4 rounded-2xl border p-4"
      >
        <div className="flex flex-wrap gap-2">
          {(["ALL", "CRITICAL", "ELEVATED", "CLEAR"] as const).map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={filters.severity === level}
              onClick={() => set({ severity: level })}
              className={cn(
                "flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition-colors",
                filters.severity === level
                  ? "border-gold/60 bg-gold/12 text-gold-deep"
                  : "border-bone/16 text-bone/70 hover:border-bone/35 hover:text-bone",
              )}
            >
              {level !== "ALL" && (
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: severityColor[level] }}
                />
              )}
              {level === "ALL" ? t("allSeverities") : tSeverity(level.toLowerCase())}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="sm:col-span-2">
            <span className={label}>{t("search")}</span>
            <input
              type="search"
              value={filters.query}
              onChange={(e) => set({ query: e.target.value })}
              placeholder={t("searchPlaceholder")}
              className={`${control} cursor-text`}
            />
          </label>
          <label>
            <span className={label}>{t("governorate")}</span>
            <select value={filters.governorate} onChange={(e) => set({ governorate: e.target.value })} className={control}>
              <option value="">{t("allProvinces")}</option>
              {options.governorates.map((key) => (
                <option key={key} value={key}>
                  {tVocab(`governorates.${key}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>{t("category")}</span>
            <select value={filters.category} onChange={(e) => set({ category: e.target.value })} className={control}>
              <option value="">{t("allCategories")}</option>
              {options.categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>{t("method")}</span>
            <select value={filters.method} onChange={(e) => set({ method: e.target.value })} className={control}>
              <option value="">{t("allMethods")}</option>
              {options.methods.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>{t("period")}</span>
            <select
              value={filters.range}
              onChange={(e) => set({ range: e.target.value as Filters["range"], anchor: Date.now() })}
              className={control}
            >
              {RANGES.map((range) => (
                <option key={range} value={range}>
                  {t(`ranges.${range}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>{t("status")}</span>
            <select
              value={filters.status}
              onChange={(e) => set({ status: e.target.value as Filters["status"] })}
              className={control}
            >
              <option value="all">{t("statusAll")}</option>
              <option value="open">{t("statusOpen")}</option>
              <option value="resolved">{t("statusResolved")}</option>
            </select>
          </label>
          <label>
            <span className={label}>{t("sort")}</span>
            <select
              value={filters.sort}
              onChange={(e) => set({ sort: e.target.value as Filters["sort"] })}
              className={control}
            >
              <option value="newest">{t("sortNewest")}</option>
              <option value="oldest">{t("sortOldest")}</option>
              <option value="severity">{t("sortSeverity")}</option>
            </select>
          </label>
          {filters.range === "custom" && (
            <>
              <label>
                <span className={label}>{t("from")}</span>
                <input type="date" value={filters.from} onChange={(e) => set({ from: e.target.value })} className={control} />
              </label>
              <label>
                <span className={label}>{t("to")}</span>
                <input type="date" value={filters.to} onChange={(e) => set({ to: e.target.value })} className={control} />
              </label>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-bone/60 text-xs tabular-nums">
            {t("resultCount", { count: filtered.length })}
          </span>
          {active && (
            <button
              type="button"
              onClick={() => setFilters(empty)}
              className="text-gold-deep hover:text-gold-deep cursor-pointer text-xs underline-offset-4 hover:underline"
            >
              {t("resetFilters")}
            </button>
          )}
        </div>
      </section>

      {filtered.length === 0 ? (
        <p className="border-bone/14 text-bone/50 rounded-2xl border border-dashed px-6 py-14 text-center text-sm">
          {t("empty")}
        </p>
      ) : (
        <ul className="border-bone/14 divide-bone/10 divide-y rounded-2xl border">
          {filtered.map((incident) => {
            const open = expandedId === incident.id;
            const meta = [incident.category, incident.method]
              .filter(Boolean)
              .join(" · ");

            return (
              <li key={incident.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : incident.id)}
                  aria-expanded={open}
                  className="hover:bg-bone/[0.03] flex min-h-14 w-full cursor-pointer items-center gap-3 px-5 py-3 text-start transition-colors"
                >
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: severityColor[incident.severity] }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-bone block truncate text-sm">
                      {incident.headline ?? incident.label}
                    </span>
                    <span className="text-bone/50 block truncate text-xs">
                      {[incident.province, meta].filter(Boolean).join(" — ")}
                    </span>
                  </span>
                  {incident.resolved && (
                    <span className="border-bone/20 text-bone/50 shrink-0 rounded-full border px-2 py-0.5 text-[11px]">
                      {t("resolved")}
                    </span>
                  )}
                  <span className="text-bone/45 shrink-0 text-xs tabular-nums">
                    {formatDate(new Date(incident.occurredAt), locale, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </button>

                {open && (
                  <div className="border-bone/10 space-y-3 border-t px-5 py-4">
                    {incident.body && (
                      <p className="text-bone/75 text-sm leading-relaxed text-pretty">
                        {incident.body}
                      </p>
                    )}
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                      {incident.actor && (
                        <Detail label={t("actor")} value={incident.actor} />
                      )}
                      {incident.target && (
                        <Detail label={t("target")} value={incident.target} />
                      )}
                      {incident.city && (
                        <Detail label={t("city")} value={incident.city} />
                      )}
                    </dl>
                    <Link
                      href={`/portal/incidents/${incident.id}`}
                      className="border-gold/40 text-gold-deep hover:bg-gold hover:text-ink inline-flex min-h-9 items-center rounded-full border px-4 text-xs transition-colors"
                    >
                      {t("viewFullReport")}
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-bone/45 text-[11px] tracking-[0.14em] uppercase">
        {label}
      </dt>
      <dd className="text-bone/80 mt-0.5 text-sm">{value}</dd>
    </div>
  );
}
