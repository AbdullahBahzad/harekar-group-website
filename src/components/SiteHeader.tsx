"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
} from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { type Locale } from "@/i18n/routing";
import Sidebar from "@/components/Sidebar";
import LocaleSwitcher from "@/components/ui/locale-switcher";
import { cn } from "@/lib/utils";

/**
 * A destination: a section of the home page (`anchor`) or a page of its own
 * (`route`). Anchors point at `#anchor` on the home page and `/{locale}#anchor`
 * everywhere else, which opens the home page — video first — and jumps there.
 */
type NavLink =
  | { id: string; anchor: string; route?: never }
  | { id: string; route: string; anchor?: never };

/**
 * A dropdown entry. `label` is a full message key, so entries can borrow
 * names that already exist elsewhere in the catalogues (a service group, a
 * client sector, an office, an FAQ question) instead of duplicating them.
 */
type MenuLink =
  | { label: string; anchor: string; route?: never }
  | { label: string; route: string; anchor?: never };

type NavEntry = NavLink & { children: MenuLink[] };

/**
 * The desktop bar, in the order the home page reads. Every entry opens a
 * dropdown on hover (or keyboard focus) listing what sits behind it — the
 * entry itself still goes straight to its section or page when clicked.
 *
 * Hash links reach into a section: `#clients-<sector>` opens the client wall
 * filtered to that sector, `#contact-<office>` opens that office's map tab,
 * `/careers#apply` the application form, `/intelligence#reports` the daily
 * reports.
 */
const desktopNav: NavEntry[] = [
  {
    id: "about",
    anchor: "about",
    children: [
      { label: "nav.whoWeAre", anchor: "about" },
      { label: "nav.missionVision", route: "/about" },
      { label: "nav.why", anchor: "why" },
    ],
  },
  {
    id: "services",
    anchor: "services",
    children: [
      { label: "nav.allServices", anchor: "services" },
      { label: "services.groups.protection", route: "/services" },
      { label: "services.groups.response", route: "/services" },
      { label: "services.groups.logistics", route: "/services" },
    ],
  },
  {
    id: "clients",
    anchor: "clients",
    children: [
      { label: "nav.allClients", anchor: "clients-all" },
      { label: "clients.groups.ngos", anchor: "clients-ngos" },
      { label: "clients.groups.energy", anchor: "clients-energy" },
      { label: "clients.groups.consulates", anchor: "clients-consulates" },
      { label: "clients.groups.locals", anchor: "clients-locals" },
    ],
  },
  {
    id: "careers",
    route: "/careers",
    children: [
      { label: "nav.whyJoin", route: "/careers#careers" },
      { label: "careers.apply.title", route: "/careers#apply" },
    ],
  },
  {
    id: "faq",
    route: "/faq",
    children: [
      { label: "faq.items.hours.q", route: "/faq" },
      { label: "faq.items.response.q", route: "/faq" },
      { label: "faq.items.licensed.q", route: "/faq" },
      { label: "faq.items.vetting.q", route: "/faq" },
      { label: "nav.allQuestions", route: "/faq" },
    ],
  },
  {
    id: "intelligence",
    anchor: "intelligence",
    children: [
      { label: "nav.liveMap", anchor: "intelligence" },
      { label: "nav.dailyReports", route: "/intelligence#reports" },
      { label: "nav.proAccess", route: "/pro" },
    ],
  },
  {
    id: "contact",
    anchor: "contact",
    children: [
      { label: "cta.primary", anchor: "contact" },
      { label: "contact.offices.erbil", anchor: "contact-erbil" },
      { label: "contact.offices.duhok", anchor: "contact-duhok" },
      { label: "contact.offices.sulaymaniyah", anchor: "contact-sulaymaniyah" },
      { label: "contact.offices.zakho", anchor: "contact-zakho" },
    ],
  },
];

/** The phone menu: everything, flat, numbered. */
const panelNav: NavLink[] = [
  { id: "home", anchor: "top" },
  { id: "about", anchor: "about" },
  { id: "services", anchor: "services" },
  { id: "why", anchor: "why" },
  { id: "clients", anchor: "clients" },
  { id: "intelligence", anchor: "intelligence" },
  { id: "careers", route: "/careers" },
  { id: "faq", route: "/faq" },
  { id: "contact", anchor: "contact" },
];

/** Every home-page anchor, for the scroll-spy. */
const spyAnchors = [
  "top",
  "about",
  "services",
  "why",
  "clients",
  "intelligence",
  "contact",
];

/** Scroll depth, in pixels, past which the bar turns solid. */
const SOLID_AT = 24;

/**
 * The site header.
 *
 * On the home page it floats transparent over the opening video — logo at the
 * start, menu at the end — and turns solid navy once the reader scrolls. On
 * every other page it is solid from the start, with a spacer beneath so the
 * page does not slide under it.
 */
export default function SiteHeader() {
  const t = useTranslations("nav");
  // Root translator, for dropdown labels that live in other namespaces.
  const tAny = useTranslations();
  const tBrand = useTranslations("brand");
  const tCta = useTranslations("cta");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  /** Which section is currently under the reading line, for the nav highlight. */
  const [active, setActive] = useState<string>("top");

  const onePager = pathname === "/";
  const solid = scrolled || !onePager;

  /* Reading progress, shown as a hairline across the foot of the bar. */
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  // Flips on a threshold crossing, not every frame — two re-renders a page.
  useMotionValueEvent(scrollY, "change", (value) => {
    const next = value > SOLID_AT;
    setScrolled((current) => (current === next ? current : next));
  });

  /*
   * Scroll-spy for the one-pager: the last section whose top has crossed the
   * reading line is the one being read.
   */
  useEffect(() => {
    if (!onePager) return;

    function updateActive() {
      const line = window.innerHeight * 0.4;
      let current = "top";
      for (const anchor of spyAnchors) {
        const el = document.getElementById(anchor);
        if (el && el.getBoundingClientRect().top <= line) current = anchor;
      }
      setActive((previous) => (previous === current ? previous : current));
    }

    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    return () => {
      window.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
    };
  }, [onePager]);

  function hrefFor(item: NavLink | MenuLink) {
    if (item.route) return `/${locale}${item.route}`;
    return onePager ? `#${item.anchor}` : `/${locale}#${item.anchor}`;
  }

  function isCurrent(item: NavEntry) {
    if (item.route) return pathname === item.route || pathname.startsWith(`${item.route}/`);
    if (onePager) return active === item.anchor;
    return item.children.some(
      (child) => child.route && pathname === child.route.split("#")[0],
    );
  }

  function switchLocale(next: Locale) {
    router.replace(pathname, { locale: next });
  }

  return (
    <>
      <header
        className={cn(
          "tone-navy fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300",
          solid
            ? "bg-ink border-bone/10 shadow-[0_8px_30px_-12px_rgba(16,29,47,0.55)]"
            : "border-bone/15 bg-gradient-to-b from-[rgba(16,29,47,0.7)] to-transparent",
        )}
      >
        <nav className="mx-auto flex h-18 w-full max-w-360 items-center justify-between gap-6 px-4 sm:px-6">
          {/* Brand — kept small so it never dominates the first screen. */}
          <Link
            href="/"
            className="focus-visible:ring-gold/60 flex shrink-0 cursor-pointer items-center gap-3 rounded-full outline-none focus-visible:ring-2"
            aria-label={tBrand("name")}
          >
            <Image
              src="/harekar-mark.png"
              alt=""
              width={488}
              height={207}
              priority
              className="h-8 w-auto"
            />
            <span className="font-display text-bone text-lg font-bold whitespace-nowrap">
              {tBrand("name")}
            </span>
          </Link>

          <div className="flex items-center gap-2 lg:gap-5">
            {/* The page list. */}
            <ul className="hidden items-center gap-0.5 text-[15px] font-semibold whitespace-nowrap xl:flex">
              {desktopNav.map((item, i) => {
                const selected = isCurrent(item);
                // The last entries open toward the start, so their panels
                // never run off the edge of the screen.
                const alignEnd = i >= desktopNav.length - 2;
                return (
                  <li key={item.id} className="group relative">
                    <a
                      href={hrefFor(item)}
                      aria-current={selected ? "true" : undefined}
                      aria-haspopup="true"
                      className={cn(
                        "focus-visible:ring-gold/60 relative flex items-center gap-1.5 rounded-md px-2.5 py-2 outline-none transition-colors duration-200 focus-visible:ring-2",
                        selected ? "text-gold-deep" : "text-bone/90 hover:text-bone",
                      )}
                    >
                      {t(item.id)}
                      <svg
                        viewBox="0 0 12 12"
                        className="size-3 opacity-80 transition-transform duration-200 group-focus-within:rotate-180 group-hover:rotate-180"
                        fill="none"
                        aria-hidden
                      >
                        <path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span
                        aria-hidden
                        className={cn(
                          "bg-gold absolute inset-x-2.5 -bottom-0.5 h-0.5 origin-center rounded-full transition-transform duration-300",
                          selected ? "scale-x-100" : "scale-x-0",
                        )}
                      />
                    </a>

                    {/*
                     * Opens on hover and on keyboard focus inside the entry,
                     * so it works without a pointer. `pt-3` bridges the gap
                     * between the link and the panel so the pointer can cross
                     * it without the menu closing.
                     */}
                    <div
                      className={cn(
                        "invisible absolute top-full z-10 translate-y-1 pt-3 opacity-0 transition-[opacity,transform,visibility] duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100",
                        alignEnd ? "end-0" : "start-0",
                      )}
                    >
                      <ul className="tone-light border-bone/10 border-t-gold w-64 overflow-hidden rounded-lg border border-t-2 bg-white py-2 shadow-[0_24px_50px_-20px_rgba(16,29,47,0.45)]">
                        {item.children.map((child) => (
                          <li key={child.label}>
                            <a
                              href={hrefFor(child)}
                              className="text-bone/85 hover:bg-surface hover:text-gold-deep focus-visible:bg-surface block px-5 py-2.5 text-[15px] leading-snug font-medium whitespace-normal outline-none transition-colors"
                            >
                              {tAny(child.label)}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                );
              })}
            </ul>

            <LocaleSwitcher onSelect={switchLocale} className="hidden sm:flex" />

            <a
              href={onePager ? "#contact" : `/${locale}#contact`}
              className="bg-gold text-ink hover:bg-gold-bright hidden min-h-11 items-center rounded-full px-5 text-sm font-bold transition-colors 2xl:inline-flex"
            >
              {tCta("primary")}
            </a>

            {/* Menu trigger — phones and tablets, where the bar has no room. */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-haspopup="dialog"
              aria-label={t("menu")}
              className="border-bone/25 text-bone hover:border-gold/60 hover:text-gold-deep flex size-11 cursor-pointer items-center justify-center rounded-full border transition-colors xl:hidden"
            >
              <span className="flex flex-col gap-[4px]">
                <span className="h-0.5 w-5 rounded-full bg-current" />
                <span className="h-0.5 w-5 rounded-full bg-current" />
                <span className="h-0.5 w-3.5 rounded-full bg-current" />
              </span>
            </button>
          </div>
        </nav>

        {/* Reading progress — a transform, so it never reflows the bar. */}
        <motion.div
          aria-hidden
          className="via-gold-bright absolute inset-x-0 bottom-0 h-px origin-left bg-gradient-to-r from-transparent to-transparent rtl:origin-right"
          style={{ scaleX: reduceMotion ? 0 : progress }}
        />

        <Sidebar
          open={open}
          onClose={() => setOpen(false)}
          items={panelNav.map((item, i) => ({
            id: item.id,
            href: hrefFor(item),
            index: String(i + 1).padStart(2, "0"),
          }))}
          onSwitchLocale={switchLocale}
        />
      </header>

      {/* Holds the header's height on pages without a full-bleed opening. */}
      {!onePager && <div aria-hidden className="h-18 shrink-0" />}
    </>
  );
}
