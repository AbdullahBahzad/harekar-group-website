import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import Panel from "@/components/admin/Panel";
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

/**
 * Command — the console's first screen.
 *
 * Deliberately not a wall of charts. What an operator needs on opening is the
 * current threat posture and what has arrived since they last looked; anything
 * beyond that is a station of its own, one click away.
 */
export default async function CommandStation({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const operator = await requireAdmin(locale);

  // One round trip for the whole deck.
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

  /*
   * A single headline word for the country, derived from the worst published
   * severity. A dashboard that makes you add up three numbers to answer "how
   * bad is it right now" has failed at its one job.
   */
  const posture =
    critical > 0 ? "CRITICAL" : elevated > 0 ? "ELEVATED" : "CLEAR";

  return (
    <>
      <header className="mb-7">
        <p className="text-gold/70 font-mono text-[10px] tracking-[0.3em] uppercase">
          Station 00
        </p>
        <h1 className="font-display text-bone mt-3 text-4xl leading-tight font-light">
          Good watch, {operator.name?.split(" ")[0] ?? "operator"}.
        </h1>
      </header>

      {/* ---- posture ---------------------------------------------------- */}
      <Panel label="National posture" index="00" tone={posture.toLowerCase() as "clear" | "elevated" | "critical"}>
        <div className="flex flex-wrap items-center gap-x-10 gap-y-6 p-6">
          <div>
            <p
              className="font-display text-5xl leading-none font-light sm:text-6xl"
              style={{ color: severityTone[posture] }}
            >
              {posture}
            </p>
            <p className="text-bone/40 mt-2 font-mono text-[10px] tracking-[0.2em] uppercase">
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
            className="border-gold/40 text-gold hover:bg-gold hover:text-ink ms-auto shrink-0 border px-5 py-2.5 font-mono text-[11px] tracking-[0.16em] uppercase transition-colors"
          >
            Open map →
          </Link>
        </div>
      </Panel>

      {/* ---- counters --------------------------------------------------- */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Counter href="/admin/messages" label="Signals" value={messages} note="quote requests" />
        <Counter href="/admin/applications" label="Personnel" value={applications} note="applications" />
        <Counter href="/admin/accounts" label="Accounts" value={accounts} note="registered" />
        <Counter href="/admin/accounts" label="Pro" value={proAccounts} note="entitled" />
      </div>

      {/* ---- logs ------------------------------------------------------- */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel label="Last edits" index="01">
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
                  <span className="text-bone/30 font-mono text-[9px] tracking-[0.18em] uppercase">
                    draft
                  </span>
                )}
                <time
                  dateTime={marker.updatedAt.toISOString()}
                  className="text-bone/30 font-mono text-[10px] tabular-nums"
                >
                  {marker.updatedAt.toISOString().slice(5, 16).replace("T", " ")}
                </time>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel label="Latest signals" index="02">
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
                  className="text-bone/30 font-mono text-[10px] tabular-nums"
                >
                  {message.createdAt.toISOString().slice(5, 10)}
                </time>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
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
        className="font-mono text-2xl leading-none tabular-nums"
        style={{ color: tone ? severityTone[tone] : "var(--color-bone)" }}
      >
        {String(value).padStart(2, "0")}
      </dd>
      <dt className="text-bone/40 mt-1.5 font-mono text-[10px] tracking-[0.16em] uppercase">
        {label}
      </dt>
    </div>
  );
}

function Counter({
  href,
  label,
  value,
  note,
}: {
  href: string;
  label: string;
  value: number;
  note: string;
}) {
  return (
    <Link href={href} className="group block">
      <Panel className="transition-colors group-hover:border-gold/30">
        <div className="p-5">
          <p className="text-bone/45 font-mono text-[10px] tracking-[0.22em] uppercase">
            {label}
          </p>
          <p className="text-bone group-hover:text-gold mt-3 font-mono text-3xl tabular-nums transition-colors">
            {String(value).padStart(2, "0")}
          </p>
          <p className="text-bone/30 mt-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            {note}
          </p>
        </div>
      </Panel>
    </Link>
  );
}
