import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/admin-format";
import {
  getFullReports,
  getReportSummaries,
  type PublicReport,
  type PublicReportSummary,
} from "@/lib/reports-public";
import type { ThreatLevel } from "@/lib/report-shape";
import Reveal from "@/components/Reveal";

/** Threat colours, matching the map's severity scale rather than inventing one. */
const threatColor: Record<ThreatLevel, string> = {
  LOW: "var(--color-status-clear)",
  MODERATE: "var(--color-status-elevated)",
  HIGH: "var(--color-status-elevated)",
  CRITICAL: "var(--color-status-critical)",
};

/** Narrows the summary type to the full one without a cast at the call site. */
function isFull(
  report: PublicReportSummary | PublicReport,
): report is PublicReport {
  return "content" in report;
}

/**
 * The Daily Security Report, delivered.
 *
 * Server component, and the entitlement decision happens here — `getFullReports`
 * is only ever called for a reader already confirmed to have Pro, and the
 * unentitled branch calls a function that cannot return the write-up at all.
 * Nothing is hidden with CSS.
 *
 * Everyone sees the bulletin list: the dates, the posture for each region and
 * how many items each carries. That is the shop window, and it is worth more
 * than an empty panel — it shows the product is real and current. The written
 * assessment is the part behind the subscription.
 */
export default async function DailyReportsSection() {
  const t = await getTranslations("reports");
  const locale = await getLocale();

  const session = await auth();
  // Already the resolved entitlement — `auth.ts` runs it through `hasProAccess`,
  // so a purchased subscription counts here exactly as a comped one does.
  const entitled = Boolean(session?.user?.isPro);
  const signedIn = Boolean(session?.user);

  const reports = entitled ? await getFullReports() : await getReportSummaries();

  return (
    <section id="reports" className="scroll-mt-24 px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <p className="text-gold/88 text-xs font-semibold tracking-[0.3em] uppercase">
            {t("eyebrow")}
          </p>
          <h2 className="font-display text-bone mt-6 text-3xl leading-[1.15] font-light text-balance sm:text-4xl">
            {t("title")}
          </h2>
          <p className="text-bone/70 mt-5 max-w-2xl text-base leading-relaxed text-pretty">
            {t("subtitle")}
          </p>
        </Reveal>

        {/* The upgrade pitch, shown once above the list rather than per row. */}
        {!entitled && (
          <div className="border-gold/35 bg-gold/[0.06] mt-10 rounded-2xl border p-6 sm:p-8">
            <h3 className="font-display text-bone text-xl leading-snug">
              {t("lockedTitle")}
            </h3>
            <p className="text-bone/70 mt-3 text-sm leading-relaxed">
              {t("lockedBody")}
            </p>
            <Link
              href={signedIn ? "/pro" : "/register"}
              className="bg-gold text-ink hover:bg-gold-bright mt-6 inline-block rounded-full px-6 py-2.5 text-sm font-medium transition-colors"
            >
              {signedIn ? t("upgrade") : t("createAccount")}
            </Link>
          </div>
        )}

        {reports.length === 0 ? (
          <p className="text-bone/55 border-bone/14 mt-10 rounded-2xl border border-dashed px-6 py-12 text-center text-sm">
            {t("empty")}
          </p>
        ) : (
          <ol className="mt-10 space-y-4">
            {reports.map((report) => (
              <li
                key={report.id}
                className="border-bone/14 bg-surface/20 rounded-2xl border p-6 sm:p-8"
              >
                <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                  <time
                    dateTime={report.date}
                    className="font-display text-bone text-lg"
                  >
                    {formatDate(new Date(report.date), locale, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </time>
                  <span className="text-bone/60 text-xs tabular-nums">
                    {t("itemCount", { count: report.itemCount })}
                  </span>
                </header>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs">
                  <Posture
                    region={t("kurdistan")}
                    label={t("threatLabel")}
                    level={report.kurdistanThreat}
                    text={t(`threat.${report.kurdistanThreat}`)}
                  />
                  <Posture
                    region={t("iraq")}
                    label={t("threatLabel")}
                    level={report.iraqThreat}
                    text={t(`threat.${report.iraqThreat}`)}
                  />
                </div>

                {/*
                 * Present only for an entitled reader — for anyone else the
                 * object simply has no `content`, because the query that built
                 * it could not return one.
                 */}
                {isFull(report) && (
                  <div className="border-bone/12 mt-6 space-y-6 border-t pt-6">
                    {report.content.items.map((item, i) => (
                      <article key={i}>
                        <h3 className="text-bone text-sm font-semibold">
                          {item.title}
                        </h3>
                        <p className="text-bone/72 mt-2 text-sm leading-relaxed whitespace-pre-wrap">
                          {item.body}
                        </p>
                      </article>
                    ))}

                    <dl className="text-bone/55 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                      {report.politicalKurdistan && (
                        <Detail
                          label={`${t("politicalLabel")} — ${t("kurdistan")}`}
                          value={report.politicalKurdistan}
                        />
                      )}
                      {report.politicalIraq && (
                        <Detail
                          label={`${t("politicalLabel")} — ${t("iraq")}`}
                          value={report.politicalIraq}
                        />
                      )}
                      {report.weather && (
                        <Detail
                          label={t("weatherLabel")}
                          value={report.weather}
                        />
                      )}
                    </dl>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function Posture({
  region,
  label,
  level,
  text,
}: {
  region: string;
  label: string;
  level: ThreatLevel;
  text: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ background: threatColor[level] }}
      />
      <span className="text-bone/50">
        {region} · {label}
      </span>
      <span style={{ color: threatColor[level] }}>{text}</span>
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-bone/60 inline">{label}: </dt>
      <dd className="text-bone/70 inline">{value}</dd>
    </div>
  );
}
