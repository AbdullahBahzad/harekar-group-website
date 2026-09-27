"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/ui/locale-switcher";
import { getDirection, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type Station = { href: string; labelKey: string; icon: ReactNode };

/**
 * One flat list, not the grouped sections the admin console's rail uses —
 * seven stations read at a glance without needing a taxonomy imposed on them.
 * 20x20 line icons at a 1.5 stroke, the same vocabulary the admin rail draws
 * from, so the two authenticated surfaces feel like one family without
 * sharing a component (the portal is a client-facing area and should not
 * import from `components/admin`).
 */
const icon = {
  reports: (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth="1.5" aria-hidden>
      <path d="M5 2.75h7.17a1 1 0 0 1 .7.29l2.09 2.09a1 1 0 0 1 .29.7V16a1.25 1.25 0 0 1-1.25 1.25H5A1.25 1.25 0 0 1 3.75 16V4A1.25 1.25 0 0 1 5 2.75Z" stroke="currentColor" />
      <path d="M7 10h6M7 13h6M7 7h3" stroke="currentColor" strokeLinecap="round" />
    </svg>
  ),
  console: (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth="1.5" aria-hidden>
      <circle cx="10" cy="10" r="2.25" stroke="currentColor" />
      <path d="M10 3.5v2M10 14.5v2M16.5 10h-2M5.5 10h-2M14.6 5.4l-1.4 1.4M6.8 13.2l-1.4 1.4M14.6 14.6l-1.4-1.4M6.8 6.8 5.4 5.4" stroke="currentColor" strokeLinecap="round" />
    </svg>
  ),
  statistics: (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth="1.5" aria-hidden>
      <path d="M4.25 16.25V3.75" stroke="currentColor" strokeLinecap="round" />
      <path d="M4.25 16.25h11.5" stroke="currentColor" strokeLinecap="round" />
      <rect x="6.25" y="10.5" width="2" height="5.75" rx="0.5" stroke="currentColor" />
      <rect x="10" y="7" width="2" height="9.25" rx="0.5" stroke="currentColor" />
      <rect x="13.75" y="12.5" width="2" height="3.75" rx="0.5" stroke="currentColor" />
    </svg>
  ),
  incidents: (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth="1.5" aria-hidden>
      <path d="M10 2.5 16.5 5v4.6c0 4.1-2.7 6.9-6.5 7.9-3.8-1-6.5-3.8-6.5-7.9V5L10 2.5Z" stroke="currentColor" strokeLinejoin="round" />
      <path d="M10 7.25v3.5" stroke="currentColor" strokeLinecap="round" />
      <circle cx="10" cy="13" r="0.15" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  ask: (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth="1.5" aria-hidden>
      <path d="M3.75 5.5A1.75 1.75 0 0 1 5.5 3.75h9A1.75 1.75 0 0 1 16.25 5.5v6a1.75 1.75 0 0 1-1.75 1.75H9l-3.5 3v-3H5.5a1.75 1.75 0 0 1-1.75-1.75v-6Z" stroke="currentColor" strokeLinejoin="round" />
      <path d="M7.9 7.75a2.1 2.1 0 1 1 3.05 1.87c-.7.37-.95.72-.95 1.38v.1" stroke="currentColor" strokeLinecap="round" />
      <circle cx="10" cy="11.75" r="0.15" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  resources: (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth="1.5" aria-hidden>
      <path d="M3.75 5.25a1.5 1.5 0 0 1 1.5-1.5H8l1.5 2h5.25a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-9Z" stroke="currentColor" strokeLinejoin="round" />
    </svg>
  ),
  guests: (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth="1.5" aria-hidden>
      <circle cx="7.25" cy="6.5" r="2.25" stroke="currentColor" />
      <path d="M2.75 16v-.75a4.5 4.5 0 0 1 4.5-4.5h0a4.5 4.5 0 0 1 4.5 4.5V16" stroke="currentColor" strokeLinecap="round" />
      <circle cx="14" cy="7.25" r="1.75" stroke="currentColor" />
      <path d="M12.5 11.25c1.9.35 3.25 1.95 3.25 4v.75" stroke="currentColor" strokeLinecap="round" />
    </svg>
  ),
} as const;

const stations: Station[] = [
  { href: "/portal/reports", labelKey: "reports", icon: icon.reports },
  { href: "/portal/incidents", labelKey: "incidents", icon: icon.incidents },
  { href: "/portal/statistics", labelKey: "statistics", icon: icon.statistics },
  { href: "/portal/ask", labelKey: "ask", icon: icon.ask },
  { href: "/portal/resources", labelKey: "resources", icon: icon.resources },
  { href: "/portal/guests", labelKey: "guests", icon: icon.guests },
  { href: "/portal/console", labelKey: "console", icon: icon.console },
];

/**
 * The portal's navigation, in two bodies sharing one source of truth — the
 * same persistent-sidebar/phone-drawer split the admin console's `ConsoleRail`
 * uses, because the problem (seven destinations, one signed-in visitor, every
 * screen size) is the same one.
 */
export default function PortalRail({
  name,
  hideGuests,
  locale,
  signOutAction,
}: {
  name: string;
  /** A guest seat cannot invite further guests — see `PortalGuest`. */
  hideGuests: boolean;
  locale: string;
  signOutAction: (formData: FormData) => void | Promise<void>;
}) {
  const t = useTranslations("portal.nav");
  const pathname = usePathname();
  const router = useRouter();
  const activeLocale = useLocale() as Locale;
  const [open, setOpen] = useState(false);

  const visible = hideGuests
    ? stations.filter((station) => station.labelKey !== "guests")
    : stations;

  const path = pathname || "/";
  const isActive = (href: string) => path.startsWith(href);

  const brand = (
    <Link href="/portal" className="flex items-center gap-2.5">
      <Image src="/harekar-mark.png" alt="" width={488} height={207} className="h-7 w-auto" />
      <span className="text-bone text-sm font-medium tracking-wide">
        {t("brand")}
      </span>
    </Link>
  );

  const nav = (onNavigate?: () => void) => (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
      {visible.map((station) => {
        const active = isActive(station.href);
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
                : "text-bone/70 hover:text-bone hover:bg-bone/[0.05]",
            )}
          >
            <span className={cn("size-5 shrink-0", active ? "text-gold" : "text-bone/50")}>
              {station.icon}
            </span>
            <span className="flex-1 truncate">{t(station.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );

  const footer = (onNavigate?: () => void) => (
    <div className="border-bone/12 space-y-3 border-t pt-4">
      <LocaleSwitcher
        onSelect={(next) => {
          onNavigate?.();
          router.replace(pathname, { locale: next });
        }}
        className="h-11 w-full justify-between rounded-lg px-3"
      />

      <p className="text-bone/55 truncate px-3 text-xs">{name}</p>

      <Link
        href="/"
        onClick={onNavigate}
        className="text-bone/55 hover:text-gold flex min-h-11 items-center gap-2 px-3 text-sm transition-colors"
      >
        <span aria-hidden className="inline-block rtl:rotate-180">
          ←
        </span>
        {t("backToSite")}
      </Link>

      <form action={signOutAction} className="px-3">
        <input type="hidden" name="locale" value={locale} />
        <button
          type="submit"
          className="border-bone/20 text-bone/65 hover:border-status-critical/50 hover:text-status-critical min-h-11 w-full cursor-pointer rounded-md border text-sm transition-colors"
        >
          {t("signOut")}
        </button>
      </form>
    </div>
  );

  return (
    <>
      <aside className="border-bone/12 bg-ink/60 sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-6 border-e p-4 md:flex">
        {brand}
        {nav()}
        {footer()}
      </aside>

      <MobilePortalNav
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        brand={brand}
        nav={nav}
        footer={footer}
        rtl={getDirection(activeLocale) === "rtl"}
      />
    </>
  );
}

function MobilePortalNav({
  open,
  onOpen,
  onClose,
  brand,
  nav,
  footer,
  rtl,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  brand: ReactNode;
  nav: (onNavigate?: () => void) => ReactNode;
  footer: (onNavigate?: () => void) => ReactNode;
  rtl: boolean;
}) {
  const t = useTranslations("portal.nav");
  const reduceMotion = useReducedMotion();
  const ease = [0.22, 1, 0.36, 1] as const;
  const offscreen = rtl ? "100%" : "-100%";

  return (
    <div className="md:hidden">
      <div className="border-bone/12 bg-ink/80 sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 backdrop-blur-xl">
        {brand}
        <button
          type="button"
          onClick={onOpen}
          aria-label={t("openMenu")}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="border-bone/20 text-bone/70 flex size-11 cursor-pointer items-center justify-center rounded-lg border"
        >
          <svg viewBox="0 0 20 20" className="size-4.5" fill="none" aria-hidden>
            <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50" initial="hidden" animate="visible" exit="hidden">
            <motion.button
              type="button"
              aria-label={t("closeMenu")}
              onClick={onClose}
              className="absolute inset-0"
              style={{ background: "#000" }}
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
              transition={{ duration: 0.3, ease }}
            />

            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={t("drawerLabel")}
              className="border-bone/14 absolute inset-y-0 start-0 flex w-[85vw] max-w-xs flex-col gap-6 border-e p-4"
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
                  aria-label={t("closeMenu")}
                  className="border-bone/20 text-bone/70 hover:border-gold hover:text-gold flex size-9 cursor-pointer items-center justify-center rounded-full border transition-colors"
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
