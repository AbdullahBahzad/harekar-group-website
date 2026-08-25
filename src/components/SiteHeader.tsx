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

/** The one-page scroll targets used for the desktop rail + scroll-spy. */
const sections = ["top", "intelligence", "services"] as const;
type SectionId = (typeof sections)[number];

const navKeys: Record<SectionId, string> = {
  top: "home",
  intelligence: "intelligence",
  services: "services",
};

/**
 * The full menu shown in the slide-in sidebar. Anchors scroll on the one-pager;
 * `about` points at the credentials strip and `contact` at its route so every
 * entry resolves to something real.
 */
const sidebarItems = [
  { id: "home", href: "#top", index: "01" },
  { id: "intelligence", href: "#intelligence", index: "02" },
  { id: "services", href: "#services", index: "03" },
  { id: "about", href: "#about", index: "04" },
  { id: "clients", href: "/clients", index: "05" },
  { id: "careers", href: "/careers", index: "06" },
  { id: "faq", href: "/faq", index: "07" },
  { id: "contact", href: "/contact", index: "08" },
] as const;

/** Scroll depth, in pixels, at which the bar condenses into its compact state. */
const CONDENSE_AT = 24;

/**
 * Shared spring for the sliding indicators.
 *
 * One curve for every pill in the bar, so the locale switcher and the section
 * links move with the same weight — different easings on sibling controls is
 * the sort of thing that reads as "unfinished" without anyone being able to
 * say why.
 */
const SLIDE = { type: "spring", stiffness: 380, damping: 32, mass: 0.7 } as const;

export default function SiteHeader() {
  const t = useTranslations("nav");
  const tBrand = useTranslations("brand");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<SectionId>("top");
  const [condensed, setCondensed] = useState(false);
  /** Which section link the pointer is over, if any. */
  const [hovered, setHovered] = useState<SectionId | null>(null);

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

  // Highlight whichever section is currently in view on the one-page scroll.
  useEffect(() => {
    if (!onePager) return;

    /*
     * The last section whose top has passed the reading line wins. A plain
     * scroll handler is used rather than IntersectionObserver because these
     * sections are far taller than the viewport, which makes ratio thresholds
     * unreliable.
     */
    function updateActive() {
      const line = window.innerHeight * 0.4;
      let current: SectionId = sections[0];

      for (const id of sections) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }

      setActive(current);
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

  /**
   * Sidebar anchor selection. On the one-pager we smooth-scroll to the target
   * and close; elsewhere we hand off to a hashed home route.
   */
  function handleNavigate(href: string) {
    const id = href.replace(/^#/, "");
    setOpen(false);

    if (!onePager) {
      router.push(`/#${id}`);
      return;
    }

    const el = document.getElementById(id);
    if (el) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }

  /** The pill follows the pointer, falling back to the current section. */
  const highlighted = hovered ?? (onePager ? active : null);

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
       * The section links are centred against the *header*, not against the
       * space left between the logo and the controls.
       *
       * Both a `justify-between` row and a `1fr auto 1fr` grid put them
       * slightly off-centre here, for the same underlying reason: the right
       * cluster is wider than the logo and wider than its own `1fr` track, so
       * it pushes the middle across. Taking the links out of flow and pinning
       * them to 50% makes their position independent of whatever sits either
       * side — which matters because that side genuinely changes width at
       * runtime as the Pro CTA appears and disappears.
       *
       * `start-1/2` is the logical inset so the anchor point flips in Arabic,
       * and the RTL translate variant corrects the direction of the offset.
       */}
      <nav
        className={`relative mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 transition-[padding] duration-500 ease-out ${
          condensed ? "py-3" : "py-5"
        }`}
      >
        <Link
          href="/"
          className="group/logo focus-visible:ring-gold/60 col-start-1 flex cursor-pointer items-center gap-3.5 justify-self-start rounded-full outline-none focus-visible:ring-2"
          aria-label={tBrand("name")}
        >
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
          <span className="font-display text-bone hidden text-lg tracking-[0.18em] uppercase sm:inline">
            {tBrand("name")}
          </span>
        </Link>

        {/*
         * Section links, in a glass rail.
         *
         * The rail gives the sliding pill something to travel inside — without
         * a container the highlight would appear to float against the page.
         */}
        <ul
          className={`border-bone/10 absolute start-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border p-1 text-sm tracking-wide backdrop-blur-md transition-colors duration-500 rtl:translate-x-1/2 xl:flex ${
            condensed ? "bg-ink/40" : "bg-bone/[0.03]"
          }`}
          onMouseLeave={() => setHovered(null)}
        >
          {sections.map((id) => {
            const selected = onePager && active === id;
            return (
              <li key={id} className="relative">
                {/* On the one-pager these scroll; elsewhere they route home first. */}
                <a
                  href={onePager ? `#${id}` : `/${locale}#${id}`}
                  aria-current={selected ? "true" : undefined}
                  onMouseEnter={() => setHovered(id)}
                  onFocus={() => setHovered(id)}
                  onBlur={() => setHovered(null)}
                  className={`focus-visible:ring-gold/60 relative block cursor-pointer rounded-full px-5 py-2 outline-none transition-colors duration-300 focus-visible:ring-2 ${
                    selected ? "text-ink" : "text-bone/70 hover:text-bone"
                  }`}
                >
                  {/*
                   * One element with a shared `layoutId` rather than one per
                   * link: that is what makes the highlight *travel* between
                   * items instead of cross-fading in place.
                   */}
                  {highlighted === id && (
                    <motion.span
                      layoutId="nav-pill"
                      aria-hidden
                      className={`absolute inset-0 -z-10 rounded-full ${
                        selected
                          ? "bg-gold shadow-[0_0_20px_-2px_rgba(197,156,64,0.6)]"
                          : "bg-bone/10"
                      }`}
                      transition={reduceMotion ? { duration: 0 } : SLIDE}
                    />
                  )}
                  <span className="relative">{t(navKeys[id])}</span>
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex shrink-0 items-center gap-2">
          {/* Current language on the face; the alternatives on open. */}
          <LocaleSwitcher onSelect={switchLocale} />

          {/*
           * Account and the Pro CTA live at the top of the sidebar menu now,
           * not here — one home for both instead of a duplicate in the bar.
           */}

          {/* Menu trigger — present on every breakpoint, opens the sidebar. */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-label={t("menu")}
            // Shares the outline recipe with every other control in the bar,
            // so border weight, radius and focus ring cannot drift apart.
            className={cn(
              buttonVariants({ variant: "outline" }),
              "group text-bone/80 relative h-11 gap-2.5 overflow-hidden px-4 duration-300",
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
        items={[...sidebarItems]}
        onNavigate={handleNavigate}
        onSwitchLocale={switchLocale}
      />
    </header>
  );
}
