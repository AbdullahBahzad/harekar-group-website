import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import Panel from "@/components/admin/Panel";
import { getRecentReports } from "@/lib/dashboard-reports";
import {
  orPreview,
  sampleMarkers,
  sampleMessages,
  sampleUsers,
} from "@/lib/admin-preview";

/** Severity colours, matching the public map exactly. */
const severityTone = {
  CLEAR: "var(--color-status-clear)",
  ELEVATED: "var(--color-status-elevated)",
  CRITICAL: "var(--color-status-critical)",
} as const;

const threatTone = {
  LOW: "var(--color-status-clear)",
  MODERATE: "var(--color-status-clear)",
  HIGH: "var(--color-status-elevated)",
  CRITICAL: "var(--color-status-critical)",
} as const;

/**
 * The dashboard — the console's first screen.
 *
 * One long, stacked column rather than a grid of cards: with ten stations
 * behind it, a dashboard that tries to fit everything side by side either
 * shrinks every number to illegibility or overflows on anything narrower
 * than a monitor. A single scrollable list of rows — same shape as every
 * other list in the console — degrades gracefully on a phone and still reads
 * as one document at a glance on a desktop.
 */
export default async function DashboardStation({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const operator = await requireAdmin(locale);

  // The map's own posture, its two logs, and the inbox counters — one round trip.
  const { data: deck } = await orPreview(
    async () =>
      Promise.all([
        prisma.intelMarker.count({ where: { published: true } }),
        prisma.intelMarker.count({ where: { published: false } }),
        prisma.intelMarker.count({ where: { published: true, severity: "CRITICAL" } }),
        prisma.intelMarker.count({ where: { published: true, severity: "ELEVATED" } }),
        prisma.intelMarker.count({ where: { published: true, access: "LOCKED" } }),
        prisma.contactSubmission.count(),
        prisma.jobApplication.count(),
        prisma.user.count(),
        prisma.user.count({ where: { isPro: true } }),
        prisma.intelMarker.findMany({
          orderBy: { updatedAt: "desc" },
          take: 6,
          select: {
            id: true, label: true, severity: true, published: true, updatedAt: true,
          },
        }),
        prisma.contactSubmission.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, name: true, organization: true, createdAt: true },
        }),
      ]),
    [
      5, 1, 1, 2, 1,
      sampleMessages.length,
      2,
      sampleUsers.length,
      1,
      sampleMarkers.map((m) => ({
        id: m.id, label: m.label, severity: m.severity,
        published: m.published, updatedAt: m.updatedAt,
      })),
      sampleMessages.map((m) => ({
        id: m.id, name: m.name, organization: m.organization,
        createdAt: m.createdAt,
      })),
    ] as const,
  );

  const [
    published, drafts, critical, elevated, locked,
    messages, applications, accounts, proAccounts,
    recentMarkers, recentMessages,
  ] = deck;

  // Every other content station, counted the same way — published vs. hidden.
  const { data: content } = await orPreview(
    async () =>
      Promise.all([
        prisma.service.count({ where: { published: true } }),
        prisma.service.count({ where: { published: false } }),
        prisma.client.count({ where: { published: true } }),
        prisma.client.count({ where: { published: false } }),
        prisma.faqItem.count({ where: { published: true } }),
        prisma.faqItem.count({ where: { published: false } }),
        prisma.careerBenefit.count({ where: { published: true } }),
        prisma.careerBenefit.count({ where: { published: false } }),
        prisma.siteContent.count(),
      ]),
    [13, 0, 37, 0, 6, 0, 5, 0, 0] as const,
  );

  const [
    liveServices, hiddenServices,
    liveClients, hiddenClients,
    liveFaq, hiddenFaq,
    liveBenefits, hiddenBenefits,
    contentSaved,
  ] = content;

  const { data: reports } = await getRecentReports(4);

  /*
   * A single headline word for the country, derived from the worst published
   * severity. A dashboard that makes you add up three numbers to answer "how
   * bad is it right now" has failed at its one job.
   */
  const posture =
    critical > 0 ? "CRITICAL" : elevated > 0 ? "ELEVATED" : "CLEAR";

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-7">
        <h1 className="font-display text-bone text-4xl leading-tight font-light">
          Welcome back, {operator.name?.split(" ")[0] ?? "there"}.
        </h1>
      </header>

      {/* ---- posture ---------------------------------------------------- */}
      <Panel label="Status overview" tone={posture.toLowerCase() as "clear" | "elevated" | "critical"}>
        <div className="flex flex-wrap items-center gap-x-10 gap-y-6 p-6">
          <div>
            <p
              className="font-display text-5xl leading-none font-light sm:text-6xl"
              style={{ color: severityTone[posture] }}
            >
              {posture}
            </p>
            <p className="text-bone/40 mt-2 text-xs">
              Highest published severity
            </p>
          </div>

          <span aria-hidden className="bg-bone/10 hidden h-14 w-px sm:block" />

          <dl className="flex flex-wrap gap-x-8 gap-y-4">
            <Metric label="Live markers" value={published} />
            <Metric label="Critical" value={critical} tone="CRITICAL" />
            <Metric label="Elevated" value={elevated} tone="ELEVATED" />
            <Metric label="Pro-gated" value={locked} />
            <Metric label="Drafts" value={drafts} />
          </dl>

          <Link
            href="/admin/intelligence"
            className="border-gold/40 text-gold hover:bg-gold hover:text-ink ms-auto shrink-0 border px-5 py-2.5 text-xs transition-colors"
          >
            Open map →
          </Link>
        </div>
      </Panel>

      {/* ---- every station, stacked ---------------------------------------- */}
      <div className="mt-5">
        <Panel label="All stations">
          <div className="divide-bone/6 divide-y">
            <StatRow href="/admin/content" label="Site content" value={contentSaved > 0 ? "Live" : "Not started"} note={contentSaved > 0 ? "console-controlled" : "showing shipped copy"} />
            <StatRow href="/admin/intelligence" label="Intelligence markers" value={published} note={`${drafts} draft${drafts === 1 ? "" : "s"}`} />
            <StatRow href="/admin/services" label="Services" value={liveServices} note={`${hiddenServices} hidden`} />
            <StatRow href="/admin/clients" label="Clients" value={liveClients} note={`${hiddenClients} hidden`} />
            <StatRow href="/admin/faq" label="FAQ" value={liveFaq} note={`${hiddenFaq} hidden`} />
            <StatRow href="/admin/benefits" label="Career benefits" value={liveBenefits} note={`${hiddenBenefits} hidden`} />
            <StatRow href="/admin/sources" label="Daily reports" value={reports.length} note="most recent" />
            <StatRow href="/admin/messages" label="Messages" value={messages} note="quote requests" />
            <StatRow href="/admin/applications" label="Applications" value={applications} note="job applications" />
            <StatRow href="/admin/accounts" label="Accounts" value={accounts} note={`${proAccounts} pro`} />
          </div>
        </Panel>
      </div>

      {/* ---- logs, stacked --------------------------------------------- */}
      <div className="mt-5 flex flex-col gap-5">
        <Panel label="Recent reports">
          <ul className="divide-bone/6 divide-y">
            {reports.length === 0 && (
              <li className="text-bone/40 px-4 py-6 text-sm">
                No reports drafted yet.
              </li>
            )}
            {reports.map((report) => (
              <li key={report.id}>
                <Link
                  href="/admin/sources"
                  className="hover:bg-bone/[0.03] flex items-center gap-3 px-4 py-2.5 transition-colors"
                >
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: threatTone[report.iraqThreat] }}
                  />
                  <span className="text-bone/85 flex-1 truncate text-sm">
                    {new Date(report.date).toLocaleDateString(undefined, {
                      weekday: "short", month: "short", day: "numeric",
                    })}
                  </span>
                  <span className="text-bone/35 text-xs">
                    KRI {report.kurdistanThreat.toLowerCase()} · Iraq {report.iraqThreat.toLowerCase()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel label="Last edits">
          <ul className="divide-bone/6 divide-y">
            {recentMarkers.length === 0 && (
              <li className="text-bone/40 px-4 py-6 text-sm">
                Nothing on the map yet.
              </li>
            )}
            {recentMarkers.map((marker) => (
              <li key={marker.id} className="flex items-center gap-3 px-4 py-2.5">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{
                    background: marker.published
                      ? severityTone[marker.severity]
                      : "transparent",
                    boxShadow: `inset 0 0 0 1.5px ${severityTone[marker.severity]}`,
                  }}
                />
                <span className="text-bone/85 flex-1 truncate text-sm">
                  {marker.label}
                </span>
                {!marker.published && (
                  <span className="text-bone/30 text-xs">
                    draft
                  </span>
                )}
                <time
                  dateTime={marker.updatedAt.toISOString()}
                  className="text-bone/30 text-xs tabular-nums"
                >
                  {marker.updatedAt.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel label="Latest messages">
          <ul className="divide-bone/6 divide-y">
            {recentMessages.length === 0 && (
              <li className="text-bone/40 px-4 py-6 text-sm">No messages yet.</li>
            )}
            {recentMessages.map((message) => (
              <li key={message.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-bone/85 flex-1 truncate text-sm">
                  {message.name}
                  {message.organization && (
                    <span className="text-bone/35"> · {message.organization}</span>
                  )}
                </span>
                <time
                  dateTime={message.createdAt.toISOString()}
                  className="text-bone/30 text-xs tabular-nums"
                >
                  {message.createdAt.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: keyof typeof severityTone;
}) {
  return (
    <div>
      <dd
        className="text-2xl leading-none tabular-nums"
        style={{ color: tone ? severityTone[tone] : "var(--color-bone)" }}
      >
        {value}
      </dd>
      <dt className="text-bone/40 mt-1.5 text-xs">
        {label}
      </dt>
    </div>
  );
}

/** One full-width row in the stacked stat list — a station's name, count and a note. */
function StatRow({
  href,
  label,
  value,
  note,
}: {
  href: string;
  label: string;
  value: number | string;
  note: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-bone/[0.03]"
    >
      <span className="text-bone/70 group-hover:text-bone text-sm transition-colors">
        {label}
      </span>
      <span className="flex items-center gap-3">
        <span className="text-bone group-hover:text-gold text-lg tabular-nums transition-colors">
          {value}
        </span>
        <span className="text-bone/30 w-28 shrink-0 truncate text-end text-xs">
          {note}
        </span>
      </span>
    </Link>
  );
}
