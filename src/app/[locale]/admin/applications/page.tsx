import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import Panel from "@/components/admin/Panel";
import { orPreview, sampleApplications } from "@/lib/admin-preview";

/** Human-readable file size. Bytes in a UI are a number nobody can picture. */
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
        <h1 className="font-display text-bone text-3xl font-light">Personnel</h1>
        <p className="text-bone/45 mt-2 max-w-2xl text-sm leading-relaxed">
          Applications received through the careers page. {applications.length}{" "}
          on file.
        </p>
      </header>

      {applications.length === 0 ? (
        <Panel label="Applications" index="03">
          <p className="text-bone/40 px-5 py-10 text-center text-sm">
            No applications yet.
          </p>
        </Panel>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <Panel key={application.id} label={application.position} index="⬒">
              <article className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="text-bone text-base font-medium">
                      {application.name}
                    </h2>
                    <span className="text-bone/35 font-mono text-[10px] tracking-[0.14em] uppercase">
                      {application.city}
                    </span>
                    <time
                      dateTime={application.createdAt.toISOString()}
                      className="text-bone/30 font-mono text-[10px] tabular-nums"
                    >
                      {application.createdAt.toISOString().slice(0, 10)}
                    </time>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
                    <a
                      href={`mailto:${application.email}`}
                      className="text-gold/80 hover:text-gold-bright transition-colors"
                    >
                      {application.email}
                    </a>
                    <a
                      href={`tel:${application.phone}`}
                      className="text-bone/50 hover:text-bone transition-colors"
                    >
                      {application.phone}
                    </a>
                  </div>

                  <p className="text-bone/65 border-bone/8 line-clamp-4 border-s-2 ps-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {application.coverLetter}
                  </p>
                </div>

                <a
                  href={`/api/admin/cv/${application.id}`}
                  download
                  className="border-gold/35 text-gold hover:bg-gold hover:text-ink flex h-fit shrink-0 flex-col items-center gap-1 border px-5 py-4 text-center transition-colors"
                >
                  <span aria-hidden className="text-lg leading-none">⤓</span>
                  <span className="font-mono text-[10px] tracking-[0.16em] uppercase">
                    CV
                  </span>
                  <span className="font-mono text-[10px] tabular-nums opacity-70">
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
