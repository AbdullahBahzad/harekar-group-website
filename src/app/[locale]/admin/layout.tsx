import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import ConsoleRail from "@/components/admin/ConsoleRail";
import { orPreview } from "@/lib/admin-preview";
import { signOutOperator } from "@/app/[locale]/admin/accounts/actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });

  return {
    // Bare, not "Admin — Harekar Group": the locale layout already sets a
    // `%s — {brand}` title template, so appending the brand here printed it
    // twice.
    title: t("brand"),
    // A signed-in operational surface must never reach an index.
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const operator = await requireAdmin(locale);
  const t = await getTranslations({ locale, namespace: "admin" });

  /*
   * The console's client components need the `admin` namespace, which the
   * locale layout deliberately withholds from the public tree — so it is
   * re-provided here, for this subtree only.
   *
   * The whole catalogue rather than just `admin`: the rail embeds the shared
   * `LocaleSwitcher`, which reads `nav`, and a provider that replaced the
   * messages with `{ admin }` alone would break it. Behind a login, the few
   * extra kilobytes cost nothing.
   */
  const consoleMessages = await getMessages();

  /*
   * Badge counts for the rail. Counted here rather than in each page so the
   * numbers agree across every station, and issued as one round trip.
   */
  const { data: counts, preview } = await orPreview(
    async () =>
      Promise.all([
        prisma.intelMarker.count({ where: { published: false } }),
        prisma.service.count({ where: { published: false } }),
        prisma.contactSubmission.count(),
        prisma.jobApplication.count(),
        prisma.order.count({ where: { status: "PENDING" } }),
      ]),
    [1, 1, 3, 2, 0] as [number, number, number, number, number],
  );
  const [drafts, hiddenServices, messages, applications, pending] = counts;

  return (
    <NextIntlClientProvider messages={consoleMessages}>
      <div className="bg-ink text-bone min-h-svh md:flex">
        {/*
         * Owns the whole nav chrome — brand, grouped links, operator label and
         * sign-out — for both the persistent tablet/desktop sidebar and the
         * phone drawer. See the component doc for why that split lives there
         * rather than here.
         */}
        <ConsoleRail
          counts={{
            "/admin/intelligence": drafts,
            "/admin/services": hiddenServices,
            "/admin/messages": messages,
            "/admin/applications": applications,
            "/admin/accounts": pending,
          }}
          operatorLabel={operator.name ?? operator.email}
          locale={locale}
          signOutAction={signOutOperator}
        />

        <div className="min-w-0 flex-1">
          {preview && (
            <p
              role="status"
              className="border-status-elevated/40 bg-status-elevated/10 text-status-elevated border-b px-5 py-2 text-center text-sm lg:px-8"
            >
              {t("preview")}
            </p>
          )}

          <main className="px-5 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
