import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/admin-format";
import Panel from "@/components/admin/Panel";
import { orPreview, sampleApplications } from "@/lib/admin-preview";

/**
 * Human-readable file size. Bytes in a UI are a number nobody can picture.
 *
 * The unit stays as the SI abbreviation in every language — KB and MB are what
 * the operating system's own file dialogs show, in any locale.
 */
function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Personnel — the careers inbox.
 *
 * `cvData` is deliberately excluded from the list query. It is up to 5MB per
 * row held inline in Postgres, and selecting it for every application would
 * pull tens of megabytes into memory to render a list that shows none of it.
 */
export default async function ApplicationsStation({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);
  const t = await getTranslations({ locale, namespace: "admin.applications" });

  const { data: applications } = await orPreview(
    () => prisma.jobApplication.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true, name: true, email: true, phone: true, city: true,
      position: true, coverLetter: true, cvName: true, cvSize: true,
      createdAt: true,
    },
    }),
    sampleApplications,
  );

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-bone text-3xl font-light">
          {t("title")}
        </h1>
        <p className="text-bone/55 mt-2 max-w-2xl text-sm leading-relaxed">
          {t("intro", { count: applications.length })}
        </p>
      </header>

      {applications.length === 0 ? (
        <Panel label={t("title")}>
          <p className="text-bone/50 px-5 py-10 text-center text-sm">
            {t("empty")}
          </p>
        </Panel>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <Panel key={application.id} label={application.position}>
              <article className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="text-bone text-base font-medium">
                      {application.name}
                    </h2>
                    <span className="text-bone/60 text-xs">
                      {application.city}
                    </span>
                    <time
                      dateTime={application.createdAt.toISOString()}
                      className="text-bone/56 text-xs tabular-nums"
                    >
                      {formatDate(application.createdAt, locale, {
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </div>

                  {/*
                   * Addresses and phone numbers are pinned LTR: both are Latin
                   * identifiers whose punctuation the bidi algorithm otherwise
                   * shuffles when they sit inside an RTL paragraph.
                   */}
                  <div dir="ltr" className="flex flex-wrap gap-x-4 gap-y-1 text-start text-xs rtl:justify-end">
                    <a
                      href={`mailto:${application.email}`}
                      className="text-gold/88 hover:text-gold-bright transition-colors"
                    >
                      {application.email}
                    </a>
                    <a
                      href={`tel:${application.phone}`}
                      className="text-bone/58 hover:text-bone transition-colors"
                    >
                      {application.phone}
                    </a>
                  </div>

                  <p className="text-bone/72 border-bone/12 line-clamp-4 border-s-2 ps-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {application.coverLetter}
                  </p>
                </div>

                <a
                  href={`/api/admin/cv/${application.id}`}
                  download
                  aria-label={t("downloadCv", { name: application.name })}
                  className="border-gold/35 text-gold hover:bg-gold hover:text-ink flex h-fit shrink-0 flex-col items-center gap-1 border px-5 py-4 text-center transition-colors"
                >
                  <span aria-hidden className="text-lg leading-none">⤓</span>
                  <span className="text-xs">{t("cv")}</span>
                  <span dir="ltr" className="text-xs tabular-nums opacity-70">
                    {formatSize(application.cvSize)}
                  </span>
                </a>
              </article>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
