"use client";

import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Console stations, numbered.
 *
 * The two-digit index is not decoration: it matches the site's public sidebar
 * numbering, so the console reads as the same system seen from the inside.
 * Intelligence sits at 01 because it is the product — the inboxes below it are
 * support functions.
 */
const stations = [
  { href: "/admin", index: "00", label: "Command", glyph: "◈" },
  { href: "/admin/intelligence", index: "01", label: "Intelligence", glyph: "◎" },
  { href: "/admin/services", index: "02", label: "Services", glyph: "❖" },
  { href: "/admin/messages", index: "03", label: "Signals", glyph: "✉" },
  { href: "/admin/applications", index: "04", label: "Personnel", glyph: "⬒" },
  { href: "/admin/accounts", index: "05", label: "Accounts", glyph: "◐" },
  { href: "/admin/reports", index: "06", label: "Reports", glyph: "▤" },
] as const;

export default function ConsoleRail({ counts }: { counts: Record<string, number> }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Console stations"
      className="border-bone/8 bg-ink/60 sticky top-0 z-30 flex h-auto shrink-0 gap-1 overflow-x-auto border-b p-2 backdrop-blur-xl lg:h-svh lg:w-56 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:border-r lg:border-b-0 lg:p-3"
    >
      <p className="text-bone/30 hidden px-3 pt-3 pb-5 font-mono text-[10px] tracking-[0.3em] uppercase lg:block">
        Station
      </p>

      {stations.map((station) => {
        /*
         * `startsWith` would light Command up on every page, since every route
         * begins with `/admin`. The root station is matched exactly and the
         * others by prefix, so their own sub-pages keep the parent lit.
         */
        const path = pathname.replace(/^\/(en|ar|ckb)/, "") || "/";
        const active =
          station.href === "/admin"
            ? path === "/admin"
            : path.startsWith(station.href);

        const count = counts[station.href] ?? 0;

        return (
          <Link
            key={station.href}
            href={station.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex shrink-0 items-center gap-3 px-3 py-2.5 font-mono text-xs tracking-[0.12em] uppercase transition-colors duration-200",
              active
                ? "text-gold"
                : "text-bone/45 hover:text-bone hover:bg-bone/[0.03]",
            )}
          >
            {/* Lit edge marks the active station without moving anything. */}
            <span
              aria-hidden
              className={cn(
                "bg-gold absolute inset-y-1 start-0 w-px transition-opacity duration-200",
                active ? "opacity-100" : "opacity-0",
              )}
            />
            <span aria-hidden className="text-[13px] leading-none opacity-70">
              {station.glyph}
            </span>
            <span className="text-[10px] tabular-nums opacity-50">
              {station.index}
            </span>
            <span className="flex-1">{station.label}</span>

            {count > 0 && (
              <span
                className="border-gold/30 text-gold/80 rounded-full border px-1.5 py-0.5 text-[10px] tabular-nums"
                aria-label={`${count} items`}
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}

      <div className="mt-auto hidden px-3 pb-2 lg:block">
        <Link
          href="/"
          className="text-bone/35 hover:text-gold font-mono text-[10px] tracking-[0.2em] uppercase transition-colors"
        >
          ← Public site
        </Link>
      </div>
    </nav>
  );
}
