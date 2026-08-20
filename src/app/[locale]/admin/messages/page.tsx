import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import Panel from "@/components/admin/Panel";
import { orPreview, sampleMessages } from "@/lib/admin-preview";

/**
 * Signals — the contact form inbox.
 *
 * These are quote requests and enquiries. Presented newest-first as a log
 * rather than a table: each entry is a paragraph of prose, and prose in a
 * fixed-width table cell is unreadable.
 */
export default async function MessagesStation({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);

  const { data: messages } = await orPreview(
    () =>
      prisma.contactSubmission.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    sampleMessages,
  );

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-bone text-3xl font-light">Signals</h1>
        <p className="text-bone/45 mt-2 max-w-2xl text-sm leading-relaxed">
          Quote requests and enquiries from the contact form. {messages.length}{" "}
          received.
        </p>
      </header>

      {messages.length === 0 ? (
        <Panel label="Inbox" index="02">
          <p className="text-bone/40 px-5 py-10 text-center text-sm">
            No messages yet.
          </p>
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {messages.map((message) => (
            <Panel
              key={message.id}
              label={message.organization ?? "Individual"}
              index="✉"
            >
              <article className="space-y-3 p-5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="text-bone text-base font-medium">
                    {message.name}
                  </h2>
                  <time
                    dateTime={message.createdAt.toISOString()}
                    className="text-bone/35 font-mono text-[10px] tabular-nums"
                  >
                    {message.createdAt.toISOString().slice(0, 16).replace("T", " ")}Z
                  </time>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
                  {/* Real mailto/tel links — the whole point of an inbox is replying. */}
                  <a
                    href={`mailto:${message.email}`}
                    className="text-gold/80 hover:text-gold-bright transition-colors"
                  >
                    {message.email}
                  </a>
                  {message.phone && (
                    <a
                      href={`tel:${message.phone}`}
                      className="text-bone/50 hover:text-bone transition-colors"
                    >
                      {message.phone}
                    </a>
                  )}
                </div>

                <p className="text-bone/70 border-bone/8 border-s-2 ps-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {message.message}
                </p>
              </article>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
