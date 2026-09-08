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
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Every public page, in the order the client asked for it to read: Home,
 * About, Intelligence, Services, Clients, FAQ, Careers, Contact. This single
 * list drives both the full desktop nav and the phone drawer, so the order
 * can never drift between them.
 */
const navItems = [
  { id: "home", anchor: "top", index: "01" },
  { id: "about", anchor: "about", index: "02" },
  { id: "intelligence", anchor: "intelligence", index: "03" },
  { id: "services", anchor: "services", index: "04" },
  { id: "clients", anchor: "clients", index: "05" },
  { id: "faq", anchor: "faq", index: "06" },
  { id: "careers", anchor: "careers", index: "07" },
  { id: "contact", anchor: "contact", index: "08" },
] as const;

/** Scroll depth, in pixels, at which the bar condenses into its compact state. */
const CONDENSE_AT = 24;

export default function SiteHeader() {
  const t = useTranslations("nav");
  const tBrand = useTranslations("brand");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  /** Which section is currently under the reading line, for the nav highlight. */
  const [active, setActive] = useState<string>("top");

  const onePager = pathname === "/";

  /*
   * Reading progress, shown as a hairline across the foot of the bar.
   *
   * It earns its place on *this* site specifically: the product is continuous
   * situational awareness, and a bar that reports how much of the picture you
   * have seen is on-message rather than ornamental.
   */
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  /*
   * The condensed state flips on a threshold crossing rather than on every
   * scroll frame. `useMotionValueEvent` reads the value outside React, so a
   * page-long scroll causes exactly two re-renders instead of hundreds.
   */
  useMotionValueEvent(scrollY, "change", (value) => {
    const next = value > CONDENSE_AT;
    setCondensed((current) => (current === next ? current : next));
  });

  /*
   * Scroll-spy for the one-pager.
   *
   * A plain scroll handler rather than IntersectionObserver: these sections are
   * far taller than the viewport, which makes ratio thresholds unreliable — the
   * last section whose top has crossed the reading line is the one being read.
   */
  useEffect(() => {
    if (!onePager) return;

    function updateActive() {
      const line = window.innerHeight * 0.4;
      let current = navItems[0].anchor as string;

      for (const item of navItems) {
        const el = document.getElementById(item.anchor);
        if (el && el.getBoundingClientRect().top <= line) current = item.anchor;
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

  function switchLocale(next: Locale) {
    router.replace(pathname, { locale: next });
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-[border-color,box-shadow] duration-500 ease-out ${
        condensed
          ? "border-gold/15 border-b shadow-[0_8px_40px_-16px_rgba(0,0,0,0.9)]"
          : "border-b border-transparent"
      }`}
      style={{ background: "#000" }}
    >
      {/*
       * Gold light bleeding down from the top edge. Sits behind the content and
       * fades out once condensed, so the bar reads as lit rather than drawn.
       */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 transition-opacity duration-500 ${
          condensed ? "opacity-0" : "opacity-100"
        }`}
        style={{
          background:
            "linear-gradient(to bottom, rgba(197,156,64,0.10) 0%, rgba(197,156,64,0.03) 40%, transparent 100%)",
        }}
      />

      {/*
       * The client asked for a literal, physical layout — menu at the far
       * left, logo at the far right — regardless of reading direction. Every
       * other control in this codebase uses logical start/end so RTL mirrors
       * correctly; these two deliberately use physical `left-`/`right-` so the
       * brand mark stays in the same corner in Arabic and Kurdish as it does
       * in English.
       */}
      <nav
        className={`relative flex w-full items-center justify-between gap-4 px-3 transition-[padding] duration-500 ease-out sm:px-4 ${
          condensed ? "py-3" : "py-5"
        }`}
      >
        {/*
         * Left cluster, hard against the edge: menu trigger first, then the
         * language switcher immediately to its right.
         */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-label={t("menu")}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "group text-bone/80 relative h-11 shrink-0 gap-2.5 overflow-hidden px-4 duration-300",
            )}
          >
            {/* Gold wash that wipes in from the leading edge on hover. */}
            <span
              aria-hidden
              className="bg-gold/10 absolute inset-0 origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100 motion-reduce:transition-none"
            />
            <span className="relative hidden text-xs tracking-[0.2em] uppercase sm:inline">
              {t("menu")}
            </span>
            <span className="relative flex flex-col gap-[3px]">
              <span className="bg-current h-px w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              <span className="bg-current h-px w-4" />
              <span className="bg-current h-px w-2.5 transition-all duration-300 group-hover:w-4" />
            </span>
          </button>

          <LocaleSwitcher onSelect={switchLocale} />
        </div>

        {/*
         * The full page list, every category the client wants visible at
         * once. Centred independently of the side controls via absolute
         * positioning at 50%, so it stays truly centred no matter how wide the
         * menu button or the logo cluster happens to be.
         */}
        <ul
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 text-[13px] font-medium tracking-wide whitespace-nowrap xl:flex"
          dir="ltr"
        >
          {navItems.map((item) => {
            const selected = onePager && active === item.anchor;
            return (
              <li key={item.id}>
                {/*
                 * A plain anchor, not next-intl's `Link`: on the one-pager
                 * these are in-page jumps, and routing through the client
                 * router would reload the page to land on the same document.
                 * Off the one-pager they fall back to `/{locale}#anchor`.
                 */}
                <a
                  href={onePager ? `#${item.anchor}` : `/${locale}#${item.anchor}`}
                  aria-current={selected ? "true" : undefined}
                  className={cn(
                    "focus-visible:ring-gold/60 relative block cursor-pointer py-2 outline-none transition-colors duration-300 focus-visible:ring-2",
                    selected ? "text-gold" : "text-bone/70 hover:text-bone",
                  )}
                >
                  {t(item.id)}
                  <span
                    aria-hidden
                    className={cn(
                      "bg-gold absolute inset-x-0 -bottom-0.5 h-px origin-center transition-transform duration-300",
                      selected ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </a>
              </li>
            );
          })}
        </ul>

        {/* Brand mark — hard against the right edge. */}
        <div className="flex shrink-0 items-center">
          <Link
            href="/"
            className="group/logo focus-visible:ring-gold/60 flex cursor-pointer items-center gap-3.5 rounded-full outline-none focus-visible:ring-2"
            aria-label={tBrand("name")}
          >
            <span className="font-display text-bone hidden text-lg tracking-[0.18em] uppercase sm:inline">
              {tBrand("name")}
            </span>
            {/* Official emblem, proportions preserved (488x207 source). */}
            <Image
              src="/harekar-mark.png"
              alt=""
              width={488}
              height={207}
              priority
              className={`w-auto transition-[height,filter] duration-500 ease-out group-hover/logo:[filter:drop-shadow(0_0_10px_rgba(197,156,64,0.45))] ${
                condensed ? "h-8 sm:h-9" : "h-9 sm:h-10"
              }`}
            />
          </Link>
        </div>
      </nav>

      {/*
       * Reading progress. `scaleX` on a transform is compositor-only, so this
       * never triggers layout — a width animation here would reflow the header
       * on every frame of every scroll.
       */}
      <motion.div
        aria-hidden
        className="via-gold-bright absolute inset-x-0 bottom-0 h-px origin-left bg-gradient-to-r from-transparent to-transparent"
        style={{ scaleX: reduceMotion ? 0 : progress }}
      />

      <Sidebar
        open={open}
        onClose={() => setOpen(false)}
        items={navItems.map(({ id, anchor, index }) => ({
          id,
          href: onePager ? `#${anchor}` : `/${locale}#${anchor}`,
          index,
        }))}
        onSwitchLocale={switchLocale}
      />
    </header>
  );
}
