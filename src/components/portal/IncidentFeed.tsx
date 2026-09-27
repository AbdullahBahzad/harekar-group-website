"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { PortalIncident } from "@/lib/portal/incidents";
import { formatDate } from "@/lib/portal/format";
import { cn } from "@/lib/utils";

type SeverityFilter = "ALL" | "CLEAR" | "ELEVATED" | "CRITICAL";

const severityColor: Record<PortalIncident["severity"], string> = {
  CLEAR: "var(--color-status-clear)",
  ELEVATED: "var(--color-status-elevated)",
  CRITICAL: "var(--color-status-critical)",
};

/**
 * Every published incident, filterable by severity and governorate — the
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

  const [severity, setSeverity] = useState<SeverityFilter>("ALL");
  const [province, setProvince] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const provinces = useMemo(
    () =>
      Array.from(
        new Set(incidents.map((incident) => incident.province).filter(Boolean)),
      ).sort() as string[],
    [incidents],
  );

  const filtered = incidents.filter(
    (incident) =>
      (severity === "ALL" || incident.severity === severity) &&
      (!province || incident.province === province),
  );

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

      <div className="mb-6 flex flex-wrap gap-2">
        {(["ALL", "CLEAR", "ELEVATED", "CRITICAL"] as const).map((level) => (
          <button
            key={level}
            type="button"
            aria-pressed={severity === level}
            onClick={() => setSeverity(level)}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition-colors",
              severity === level
                ? "border-gold/60 bg-gold/12 text-gold"
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

        {provinces.length > 0 && (
          <select
            value={province}
            onChange={(event) => setProvince(event.target.value)}
            aria-label={t("filterByProvince")}
            className="border-bone/16 bg-ink/60 text-bone focus:border-gold min-h-11 cursor-pointer rounded-full border px-4 text-sm outline-none"
          >
            <option value="">{t("allProvinces")}</option>
            {provinces.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}

        <span className="text-bone/45 ms-auto self-center text-xs tabular-nums">
          {t("resultCount", { count: filtered.length })}
        </span>
      </div>

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
