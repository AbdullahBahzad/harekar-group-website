import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { getPublishedMarkerById } from "@/lib/intel";
import { formatDate } from "@/lib/admin-format";
import { Link } from "@/i18n/navigation";
import { severityColor } from "@/data/iraq";
import CopyLinkButton from "@/components/CopyLinkButton";
import ReportLocationMap from "@/components/ReportLocationMap";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "intelligence" });
  const session = await auth();
  const marker = await getPublishedMarkerById(id, Boolean(session?.user?.isPro));
  return { title: marker ? `${marker.label} — ${t("title")}` : t("report.notFoundTitle") };
}

/**
 * One marker's report, at its own shareable URL — the deep link the side
 * panel's "Full report" button points to, and the thing a copied link
 * actually resolves to for anyone it is sent to.
 *
 * The entitlement gate is the same one `IntelligenceSection` applies to the
 * map: resolved here, on the server, from the session — never from a flag
 * the browser could set on itself.
 */
export default async function MarkerReportPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("intelligence");

  const session = await auth();
  const signedIn = Boolean(session?.user);
  const isPro = Boolean(session?.user?.isPro);
  const marker = await getPublishedMarkerById(id, isPro);

  if (!marker) notFound();

  const [lng, lat] = marker.coordinates;
  // Absence of `body` already means "this reader isn't entitled" — every
  // marker is Pro-gated now, regardless of its own `access` value; see the
  // comment in `getPublishedMarkerById`.
  const restricted = !marker.body;

  return (
    <section className="mx-auto max-w-3xl px-6 py-24 sm:px-10">
      <Link
        href="/intelligence"
        className="text-bone/55 hover:text-gold inline-flex items-center gap-2 text-sm transition-colors"
      >
        <span aria-hidden>←</span>
        {t("report.backToMap")}
      </Link>

      <header className="mt-8">
        <div className="flex flex-wrap items-center gap-3">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: severityColor[marker.severity] }}
          />
          <span
            className="text-xs font-semibold tracking-wide uppercase"
            style={{ color: severityColor[marker.severity] }}
          >
            {t(`severity.${marker.severity}`)}
          </span>
          {marker.resolved && (
            <span className="border-bone/26 text-bone/60 rounded-full border px-2.5 py-0.5 text-[10px] tracking-wide uppercase">
              {t("report.resolved")}
            </span>
          )}
          {restricted && (
            <span className="border-gold/50 text-gold rounded-full border px-2.5 py-0.5 text-[10px] tracking-wide uppercase">
              {t("modal.badge")}
            </span>
          )}
        </div>

        <h1 className="font-display text-bone mt-4 text-3xl leading-snug sm:text-4xl">
          {marker.headline ?? marker.label}
        </h1>
        <p className="text-bone/50 mt-3 text-sm">
          {marker.label} ·{" "}
          {t("report.updated", {
            date: formatDate(marker.updatedAt, locale, { dateStyle: "medium" }),
          })}
        </p>
      </header>

      <div className="mt-8">
        {marker.body ? (
          <p className="text-bone/75 text-base leading-relaxed whitespace-pre-wrap">
            {marker.body}
          </p>
        ) : (
          <div className="border-gold/35 bg-gold/[0.04] rounded-2xl border p-6 sm:p-8">
            <h2 className="font-display text-bone text-xl leading-snug">
              {isPro ? t("modal.titlePro", { city: marker.label }) : t("modal.title")}
            </h2>
            <p className="text-bone/70 mt-3 text-sm leading-relaxed">
              {isPro ? t("modal.bodyPro") : t("modal.body")}
            </p>
            {!isPro && (
              <Link
                href={signedIn ? "/pro" : "/register"}
                className="bg-gold text-ink hover:bg-gold-bright mt-6 inline-block rounded-full px-6 py-2.5 text-sm font-medium transition-colors"
              >
                {signedIn ? t("modal.upgrade") : t("modal.createAccount")}
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="mt-10">
        <ReportLocationMap
          lat={lat}
          lng={lng}
          severity={marker.severity}
          label={marker.label}
          ariaLabel={marker.label}
        />
      </div>

      <div className="mt-8">
        <CopyLinkButton label={t("report.copyLink")} copiedLabel={t("report.linkCopied")} />
      </div>
    </section>
  );
}
