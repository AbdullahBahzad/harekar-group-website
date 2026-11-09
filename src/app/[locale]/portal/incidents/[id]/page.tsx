import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePortalUser } from "@/lib/portal/entitlement";
import { getPortalIncident } from "@/lib/portal/incidents";
import { formatDate } from "@/lib/portal/format";
import { severityColor } from "@/data/iraq";
import { Link } from "@/i18n/navigation";
import ReportLocationMap from "@/components/ReportLocationMap";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "portal.incident" });
  return { title: t("title") };
}

/**
 * One incident in full, inside the portal: the analyst's brief, the
 * classification, the location with its map, how and when it entered the
 * register, and the source it came from — the record behind every pin on the
 * Console and every line of the Incident Feed.
 */
export default async function PortalIncidentPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePortalUser(locale, `/portal/incidents/${id}`);

  const incident = await getPortalIncident(id);
  if (!incident) notFound();

  const t = await getTranslations({ locale, namespace: "portal.incident" });
  const tSeverity = await getTranslations({ locale, namespace: "intelligence.severity" });
  const tConsole = await getTranslations({ locale, namespace: "portal.console" });
  const tGovernorate = await getTranslations({ locale, namespace: "reportVocab.governorates" });

  const severity = incident.severity.toLowerCase() as keyof typeof severityColor;
  const tone = severityColor[severity];
  const when = (iso: string) =>
    formatDate(new Date(iso), locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Baghdad",
    });

  // How long after the event it was filed — Conterra's "ingestion latency".
  const latencyMinutes = Math.round(
    (Date.parse(incident.createdAt) - Date.parse(incident.occurredAt)) / 60_000,
  );
  const latency =
    latencyMinutes <= 0
      ? null
      : latencyMinutes < 120
        ? t("latencyMinutes", { count: latencyMinutes })
        : t("latencyHours", { count: Math.round(latencyMinutes / 60) });

  const governorate = incident.governorate ? tGovernorate(incident.governorate) : null;
  const title = incident.headline ?? incident.label;

  return (
    <article className="space-y-5">
      <Link
        href="/portal/console"
        className="text-bone/60 hover:text-gold inline-flex min-h-9 items-center gap-2 text-sm transition-colors"
      >
        <span aria-hidden className="rtl:rotate-180">←</span>
        {t("back")}
      </Link>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded border px-2 py-0.5 text-[11px] font-semibold tracking-[0.12em] uppercase"
            style={{ color: tone, borderColor: tone }}
          >
            {tSeverity(severity)}
          </span>
          {[incident.category, incident.incidentType].filter(Boolean).map((tag) => (
            <span key={tag} className="text-bone/55 text-[11px] tracking-[0.14em] uppercase">
              {tag}
            </span>
          ))}
          {incident.resolved && (
            <span className="border-bone/20 text-bone/50 rounded-full border px-2 py-0.5 text-[11px]">
              {t("resolved")}
            </span>
          )}
        </div>
        <h1 className="font-display text-bone mt-3 text-3xl font-light text-pretty">{title}</h1>
        <p className="text-bone/55 mt-2 text-sm">
          {[when(incident.occurredAt), incident.city, governorate].filter(Boolean).join(" · ")}
        </p>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="space-y-5">
          <Card title={t("brief")} accent>
            <p className="text-bone/85 text-sm leading-relaxed text-pretty">
              {incident.body ?? title}
            </p>
            {incident.keyPoints && (
              <ul className="text-bone/70 mt-4 space-y-1.5 text-sm">
                {incident.keyPoints
                  .split("\n")
                  .map((line) => line.replace(/^[-•*]\s*/, "").trim())
                  .filter(Boolean)
                  .map((line) => (
                    <li key={line} className="flex gap-2">
                      <span aria-hidden className="bg-gold/60 mt-2 size-1.5 shrink-0 rounded-full" />
                      {line}
                    </li>
                  ))}
              </ul>
            )}
          </Card>

          <Card title={t("classification")}>
            <Fields
              rows={[
                [t("category"), incident.category],
                [t("incidentType"), incident.incidentType],
                [t("method"), incident.method],
                [t("actor"), join(incident.actor, incident.actorDetail)],
                [t("target"), join(incident.target, incident.targetDetail)],
              ]}
              empty={t("unknown")}
            />
          </Card>

          <Card title={t("location")}>
            <Fields
              rows={[
                [t("facility"), incident.facility],
                [t("streetAddress"), incident.streetAddress],
                [t("city"), incident.city],
                [t("district"), incident.district],
                [t("province"), governorate ?? incident.province],
                [t("country"), t("iraq")],
              ]}
              empty={t("unknown")}
            />
          </Card>
        </div>

        <Card title={t("map")}>
          <div className="mb-3 flex flex-wrap gap-2">
            <span dir="ltr" className="bg-ink/60 text-bone/75 rounded-md px-2.5 py-1 text-[11px] tabular-nums">
              LAT: {incident.latitude.toFixed(6)}
            </span>
            <span dir="ltr" className="bg-ink/60 text-bone/75 rounded-md px-2.5 py-1 text-[11px] tabular-nums">
              LNG: {incident.longitude.toFixed(6)}
            </span>
          </div>
          <ReportLocationMap
            lat={incident.latitude}
            lng={incident.longitude}
            severity={severity}
            label={incident.city ?? incident.label}
            ariaLabel={t("map")}
          />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={t("telemetry")} accent>
          <dl className="space-y-4">
            {latency && (
              <Telemetry label={t("latency")} value={latency} hint={t("latencyHint")} />
            )}
            <Telemetry label={t("verification")} value={t("analystVerified")} hint={t("verificationHint")} />
            {incident.sourceReliability && (
              <Telemetry
                label={tConsole("sourceReliability")}
                value={tConsole(`reliability.${incident.sourceReliability}`)}
              />
            )}
            {incident.infoCredibility && (
              <Telemetry
                label={tConsole("infoReliability")}
                value={tConsole(`credibility.${incident.infoCredibility}`)}
              />
            )}
          </dl>
        </Card>

        <Card title={t("origin")}>
          {incident.sourceName || incident.sourceUrl || incident.sourceText ? (
            <>
              <p className="text-bone text-sm font-medium">{incident.sourceName ?? t("unnamedSource")}</p>
              {incident.sourcePublishedAt && (
                <p className="text-bone/50 mt-0.5 text-xs">
                  {t("published", { date: when(incident.sourcePublishedAt) })}
                </p>
              )}
              {incident.sourceText && (
                <p className="bg-ink/50 text-bone/70 mt-3 rounded-lg p-3 font-mono text-xs leading-relaxed">
                  {incident.sourceText}
                </p>
              )}
              {incident.sourceUrl && (
                <a
                  href={incident.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-status-clear/85 text-ink hover:bg-status-clear mt-4 inline-flex min-h-10 items-center rounded-lg px-4 text-xs font-medium transition-colors"
                >
                  {tConsole("sourceDocumentation")}
                </a>
              )}
            </>
          ) : (
            <p className="text-bone/50 text-sm">{t("noSource")}</p>
          )}
        </Card>
      </div>
    </article>
  );
}

function join(main: string | null, detail: string | null): string | null {
  if (!main) return detail;
  return detail ? `${main} — ${detail}` : main;
}

function Card({ title, accent = false, children }: { title: string; accent?: boolean; children: ReactNode }) {
  return (
    <section
      className={`border-bone/14 bg-surface/20 rounded-2xl border p-5 ${accent ? "border-t-gold/60 border-t-2" : ""}`}
    >
      <h2 className="text-gold/85 mb-4 text-[11px] font-medium tracking-[0.16em] uppercase">{title}</h2>
      {children}
    </section>
  );
}

function Fields({ rows, empty }: { rows: [string, string | null][]; empty: string }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-bone/45 text-[11px] tracking-[0.14em] uppercase">{label}</dt>
          <dd className={`mt-0.5 text-sm ${value ? "text-bone/85" : "text-bone/35"}`}>{value ?? empty}</dd>
        </div>
      ))}
    </dl>
  );
}

function Telemetry({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-bone/45 text-[11px] tracking-[0.14em] uppercase">{label}</dt>
      <dd className="text-bone mt-0.5 text-sm font-medium">{value}</dd>
      {hint && <p className="text-bone/45 mt-0.5 text-xs">{hint}</p>}
    </div>
  );
}
