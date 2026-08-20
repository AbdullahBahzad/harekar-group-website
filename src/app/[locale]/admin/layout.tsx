import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono } from "next/font/google";
import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import ConsoleRail from "@/components/admin/ConsoleRail";
import { orPreview } from "@/lib/admin-preview";
import StationClock from "@/components/admin/StationClock";
import { signOutOperator } from "@/app/[locale]/admin/accounts/actions";

/**
 * The console's data face.
 *
 * A monospace is not a style choice here — this screen is almost entirely
 * counts, coordinates, severities and timestamps, and proportional digits make
 * a column of numbers impossible to scan. Plex Mono has enough character to
 * carry the register without drifting into pastiche.
 */
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Console — Harekar Group",
  // A signed-in operational surface must never reach an index.
  robots: { index: false, follow: false, nocache: true },
};

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
    <div
      className={`${plexMono.variable} bg-ink text-bone relative min-h-svh lg:flex`}
    >
      {/*
       * Atmosphere: a hairline survey grid under everything, and a very faint
       * gold bloom from the top. Flat black would read as an unfinished admin
       * template; this gives the console depth without costing an image.
       */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(243,236,225,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(243,236,225,0.028) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-64"
        style={{
          background:
            "radial-gradient(80% 100% at 50% 0%, rgba(197,156,64,0.07) 0%, transparent 70%)",
        }}
      />

      <ConsoleRail
        counts={{
          "/admin/intelligence": drafts,
          "/admin/services": hiddenServices,
          "/admin/messages": messages,
          "/admin/applications": applications,
          "/admin/accounts": pending,
        }}
      />

      <div className="relative z-10 min-w-0 flex-1">
        <header className="border-bone/8 flex flex-wrap items-center gap-x-5 gap-y-2 border-b px-5 py-3 lg:px-8">
          <span className="text-gold font-mono text-[11px] tracking-[0.3em] uppercase">
            Harekar · Console
          </span>
          <span aria-hidden className="bg-bone/10 hidden h-3 w-px sm:block" />
          <StationClock />
          <span aria-hidden className="via-bone/10 h-px flex-1 bg-gradient-to-r from-transparent to-transparent" />
          <span className="text-bone/45 font-mono text-[11px] tracking-[0.12em]">
            {operator.name ?? operator.email}
          </span>
          {/* Steady, not blinking — a pulsing dot on every screen is noise. */}
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="bg-status-clear size-1.5 rounded-full" />
            <span className="text-status-clear/80 font-mono text-[10px] tracking-[0.2em] uppercase">
              Live
            </span>
          </span>

          {/*
           * Sign-out lives in the console chrome rather than only on the
           * public account page: an operator who wants out of an operational
           * surface should not have to navigate back into the marketing site
           * to find the door.
           */}
          <form action={signOutOperator}>
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className="border-bone/15 text-bone/55 hover:border-status-critical/50 hover:text-status-critical cursor-pointer border px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] uppercase transition-colors"
            >
              Sign out
            </button>
          </form>
        </header>

        {preview && (
          <p
            role="status"
            className="border-status-elevated/40 bg-status-elevated/10 text-status-elevated border-b px-5 py-2 text-center font-mono text-[10px] tracking-[0.18em] uppercase lg:px-8"
          >
            Preview — no database connected. Figures below are sample data.
          </p>
        )}

        <main className="relative px-5 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
