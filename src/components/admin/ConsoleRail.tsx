"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/ui/locale-switcher";
import { getDirection, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Stations carry a translation key, not a label. The console renders in three
 * languages and this list is the one place every station is named.
 */
type Station = { href: string; labelKey: string; icon: ReactNode };
type Group = { labelKey: string; stations: Station[] };

const icon = {
  dashboard: (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth="1.5" aria-hidden>
      <rect x="2.75" y="2.75" width="6.5" height="6.5" rx="1.25" stroke="currentColor" />
      <rect x="10.75" y="2.75" width="6.5" height="4.5" rx="1.25" stroke="currentColor" />
      <rect x="10.75" y="9.25" width="6.5" height="8" rx="1.25" stroke="currentColor" />
      <rect x="2.75" y="11.25" width="6.5" height="6" rx="1.25" stroke="currentColor" />
    </svg>
  ),
  content: (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth="1.5" aria-hidden>
      <path d="M5 2.75h7.17a1 1 0 0 1 .7.29l2.09 2.09a1 1 0 0 1 .29.7V16a1.25 1.25 0 0 1-1.25 1.25H5A1.25 1.25 0 0 1 3.75 16V4A1.25 1.25 0 0 1 5 2.75Z" stroke="currentColor" />
      <path d="M7 10h6M7 13h6M7 7h3" stroke="currentColor" strokeLinecap="round" />
    </svg>
  ),
  map: (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth="1.5" aria-hidden>
      <path d="M10 17.5s5.5-4.8 5.5-9.25a5.5 5.5 0 1 0-11 0c0 4.45 5.5 9.25 5.5 9.25Z" stroke="currentColor" />
      <circle cx="10" cy="8.25" r="2" stroke="currentColor" />
    </svg>
  ),
  services: (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth="1.5" aria-hidden>
      <path d="M10 2.5 16.5 5v4.6c0 4.1-2.7 6.9-6.5 7.9-3.8-1-6.5-3.8-6.5-7.9V5L10 2.5Z" stroke="currentColor" strokeLinejoin="round" />
      <path d="M7.4 10 9 11.6l3.6-3.6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  clients: (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth="1.5" aria-hidden>
      <path d="M3.5 17.25V4.75A1 1 0 0 1 4.5 3.75h6a1 1 0 0 1 1 1v12.5" stroke="currentColor" strokeLinejoin="round" />
      <path d="M11.5 8.25h4a1 1 0 0 1 1 1v8h-5" stroke="currentColor" strokeLinejoin="round" />
      <path d="M6 6.75h2.5M6 9.75h2.5M6 12.75h2.5" stroke="currentColor" strokeLinecap="round" />
    </svg>
  ),
  faq: (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth="1.5" aria-hidden>
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" />
      <path d="M7.9 7.75a2.1 2.1 0 1 1 3.05 1.87c-.7.37-.95.72-.95 1.38v.25" stroke="currentColor" strokeLinecap="round" />
      <circle cx="10" cy="13.75" r="0.15" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  benefits: (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth="1.5" aria-hidden>
      <circle cx="7.25" cy="6.5" r="2.25" stroke="currentColor" />
      <path d="M2.75 16v-.75a4.5 4.5 0 0 1 4.5-4.5h0a4.5 4.5 0 0 1 4.5 4.5V16" stroke="currentColor" strokeLinecap="round" />
      <path d="M14 4.25v4.5M16.25 6.5h-4.5" stroke="currentColor" strokeLinecap="round" />
    </svg>
  ),
  messages: (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth="1.5" aria-hidden>
      <rect x="2.75" y="4.75" width="14.5" height="10.5" rx="1.5" stroke="currentColor" />
      <path d="m3.25 5.5 6.75 5 6.75-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  applications: (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth="1.5" aria-hidden>
      <path d="M5.5 2.75h6.17a1 1 0 0 1 .7.29l1.59 1.59a1 1 0 0 1 .29.7V16A1.25 1.25 0 0 1 12.75 17.25h-7.25A1.25 1.25 0 0 1 4.25 16V4A1.25 1.25 0 0 1 5.5 2.75Z" stroke="currentColor" />
      <path d="m7.25 10 1.6 1.6 3.4-3.6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  accounts: (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth="1.5" aria-hidden>
      <circle cx="10" cy="7" r="3" stroke="currentColor" />
      <path d="M3.75 16.5a6.25 6.25 0 0 1 12.5 0" stroke="currentColor" strokeLinecap="round" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth="1.5" aria-hidden>
      <path d="M4.25 16.25V3.75" stroke="currentColor" strokeLinecap="round" />
      <path d="M4.25 16.25h11.5" stroke="currentColor" strokeLinecap="round" />
      <rect x="6.25" y="10.5" width="2" height="5.75" rx="0.5" stroke="currentColor" />
      <rect x="10" y="7" width="2" height="9.25" rx="0.5" stroke="currentColor" />
      <rect x="13.75" y="12.5" width="2" height="3.75" rx="0.5" stroke="currentColor" />
    </svg>
  ),
} as const;

/** Console sections, grouped the way an operator actually thinks about them. */
const groups: Group[] = [
  {
    labelKey: "overview",
    stations: [{ href: "/admin", labelKey: "dashboard", icon: icon.dashboard }],
  },
  {
    labelKey: "content",
    stations: [
      { href: "/admin/content", labelKey: "siteContent", icon: icon.content },
      { href: "/admin/intelligence", labelKey: "intelligence", icon: icon.map },
      { href: "/admin/services", labelKey: "services", icon: icon.services },
      { href: "/admin/clients", labelKey: "clients", icon: icon.clients },
      { href: "/admin/faq", labelKey: "faq", icon: icon.faq },
      { href: "/admin/benefits", labelKey: "benefits", icon: icon.benefits },
    ],
  },
  {
    labelKey: "inbox",
    stations: [
      { href: "/admin/messages", labelKey: "messages", icon: icon.messages },
      { href: "/admin/applications", labelKey: "applications", icon: icon.applications },
    ],
  },
  {
    labelKey: "access",
    stations: [{ href: "/admin/accounts", labelKey: "accounts", icon: icon.accounts }],
  },
  {
    labelKey: "sources",
    stations: [{ href: "/admin/sources", labelKey: "reports", icon: icon.reports }],
  },
];

/**
 * The console's navigation, in two bodies sharing one source of truth.
 *
 * From `md` up it is a persistent, grouped sidebar — the console has ten
 * stations now, and a flat unstyled list of ten text links stopped being
 * scannable somewhere around the seventh. Icons and section labels are what
 * turn "find Applications" back into a glance instead of a read.
 *
 * Below `md` there is no room for a persistent 14rem column, so the same
 * grouped list moves into a slide-in drawer — the same interaction and
 * motion the public site's own `Sidebar` already uses, rather than a second,
 * different pattern for the operator to learn.
 */
export default function ConsoleRail({
  counts,
  operatorLabel,
  locale,
  signOutAction,
}: {
  counts: Record<string, number>;
  operatorLabel: string;
  locale: string;
  signOutAction: (formData: FormData) => void | Promise<void>;
}) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const router = useRouter();
  const activeLocale = useLocale() as Locale;
  const [open, setOpen] = useState(false);

  // next-intl's `usePathname` already returns the path with the locale prefix
  // stripped, so there is nothing to trim off by hand.
  const path = pathname || "/";
  const isActive = (href: string) =>
    href === "/admin" ? path === "/admin" : path.startsWith(href);

  const brand = (
    <Link href="/admin" className="flex items-center gap-2.5">
      <Image src="/harekar-mark.png" alt="" width={488} height={207} className="h-7 w-auto" />
      <span className="text-bone text-sm font-medium tracking-wide">
        {t("brand")}
      </span>
    </Link>
  );

  const nav = (onNavigate?: () => void) => (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
      {groups.map((group) => (
        <div key={group.labelKey}>
          <p className="text-bone/35 px-3 pb-1.5 text-[11px] tracking-[0.14em] uppercase">
            {t(`nav.groups.${group.labelKey}`)}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.stations.map((station) => {
              const active = isActive(station.href);
              const count = counts[station.href] ?? 0;

              return (
                <Link
                  key={station.href}
                  href={station.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
                    active
                      ? "bg-gold/12 text-gold"
                      : "text-bone/60 hover:text-bone hover:bg-bone/[0.05]",
                  )}
                >
                  <span className={cn("size-5 shrink-0", active ? "text-gold" : "text-bone/40")}>
                    {station.icon}
                  </span>
                  <span className="flex-1 truncate">
                    {t(`nav.${station.labelKey}`)}
                  </span>
                  {count > 0 && (
                    <span
                      className="bg-gold/15 text-gold rounded-full px-1.5 py-0.5 text-xs tabular-nums"
                      aria-label={t("nav.badge", { count })}
                    >
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const footer = (onNavigate?: () => void) => (
    <div className="border-bone/8 space-y-3 border-t pt-4">
      {/*
       * The language control lives with the operator's own settings rather
       * than in the nav list: switching language is something you do once, not
       * a station you visit. It swaps locale on the current path, so an
       * operator mid-task lands back on the same screen in the new language.
       */}
      <LocaleSwitcher
        onSelect={(next) => {
          onNavigate?.();
          router.replace(pathname, { locale: next });
        }}
        className="h-11 w-full justify-between rounded-lg px-3"
      />

      <p className="text-bone/45 truncate px-3 text-xs">{operatorLabel}</p>

      <Link
        href="/"
        onClick={onNavigate}
        className="text-bone/45 hover:text-gold flex min-h-11 items-center gap-2 px-3 text-sm transition-colors"
      >
        {/* Points back the way you came, which is the other way under RTL. */}
        <span aria-hidden className="inline-block rtl:rotate-180">
          ←
        </span>
        {t("nav.backToSite")}
      </Link>

      <form action={signOutAction} className="px-3">
        <input type="hidden" name="locale" value={locale} />
        <button
          type="submit"
          className="border-bone/15 text-bone/55 hover:border-status-critical/50 hover:text-status-critical min-h-11 w-full cursor-pointer rounded-md border text-sm transition-colors"
        >
          {t("nav.signOut")}
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* ---- desktop / tablet: persistent sidebar ---- */}
      <aside className="border-bone/8 bg-ink/60 sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-6 border-e p-4 md:flex">
        {brand}
        {nav()}
        {footer()}
      </aside>

      {/* ---- phone: sticky top bar + slide-in drawer ---- */}
      <MobileNav
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        brand={brand}
        nav={nav}
        footer={footer}
        badgeCount={Object.values(counts).reduce((a, b) => a + b, 0)}
        rtl={getDirection(activeLocale) === "rtl"}
      />
    </>
  );
}

function MobileNav({
  open,
  onOpen,
  onClose,
  brand,
  nav,
  footer,
  badgeCount,
  rtl,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  brand: ReactNode;
  nav: (onNavigate?: () => void) => ReactNode;
  footer: (onNavigate?: () => void) => ReactNode;
  badgeCount: number;
  /** Which edge the drawer is docked to, so it slides in off-screen. */
  rtl: boolean;
}) {
  const t = useTranslations("admin");
  const reduceMotion = useReducedMotion();
  const ease = [0.22, 1, 0.36, 1] as const;

  /*
   * The panel is docked with `start-0`, so it sits on the left in LTR and the
   * right in RTL. Framer's `x` is a raw transform and knows nothing about
   * writing direction — a fixed `-100%` would slide the RTL drawer in from the
   * far side, across the screen it is anchored against.
   */
  const offscreen = rtl ? "100%" : "-100%";

  return (
    <div className="md:hidden">
      <div className="border-bone/8 bg-ink/80 sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 backdrop-blur-xl">
        {brand}
        <button
          type="button"
          onClick={onOpen}
          aria-label={t("nav.openMenu")}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="border-bone/15 text-bone/70 relative flex size-11 cursor-pointer items-center justify-center rounded-lg border"
        >
          <svg viewBox="0 0 20 20" className="size-4.5" fill="none" aria-hidden>
            <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {badgeCount > 0 && (
            <span className="bg-gold absolute -top-1 -end-1 size-2.5 rounded-full" aria-hidden />
          )}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50" initial="hidden" animate="visible" exit="hidden">
            <motion.button
              type="button"
              aria-label={t("nav.closeMenu")}
              onClick={onClose}
              className="absolute inset-0"
              style={{ background: "#000" }}
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
              transition={{ duration: 0.3, ease }}
            />

            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={t("nav.drawerLabel")}
              className="border-bone/10 absolute inset-y-0 start-0 flex w-[85vw] max-w-xs flex-col gap-6 border-e p-4"
              style={{ background: "#000" }}
              variants={{
                hidden: { x: reduceMotion ? 0 : offscreen, opacity: reduceMotion ? 0 : 1 },
                visible: { x: 0, opacity: 1 },
              }}
              transition={{ duration: 0.35, ease }}
            >
              <div className="flex items-center justify-between">
                {brand}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t("nav.closeMenu")}
                  className="border-bone/15 text-bone/70 hover:border-gold hover:text-gold flex size-9 cursor-pointer items-center justify-center rounded-full border transition-colors"
                >
                  <svg viewBox="0 0 20 20" className="size-3.5" fill="none" aria-hidden>
                    <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {nav(onClose)}
              {footer(onClose)}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
