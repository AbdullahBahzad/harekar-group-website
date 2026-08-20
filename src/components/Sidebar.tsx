"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";

const localeLabels: Record<Locale, string> = {
  en: "EN",
  ar: "ع",
  ckb: "کوردی",
};

/**
 * A navigation entry. `href` targets either an in-page anchor (one-pager) or a
 * local. route. `index` is the display number that reinforces the intelligence
 * dossier aesthetic.
 */
type NavItem = { id: string; href: string; index: string };

/**
 * The premium slide-in navigation panel opened from the header menu button.
 *
 * Enters from the right over a darkened, blurred backdrop; links stagger in as
 * large editorial type and catch a gold underline on hover. Escape, backdrop
 * click, or selecting a destination all close it. Focus moves into the panel on
 * open and returns to the trigger on close, and body scroll is locked while open.
 */
export default function Sidebar({
  open,
  onClose,
  items,
  onNavigate,
  onSwitchLocale,
}: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  /** Called with the anchor id when an in-page link is chosen. */
  onNavigate: (href: string) => void;
  onSwitchLocale: (locale: Locale) => void;
}) {
  const t = useTranslations("nav");
  const tBrand = useTranslations("brand");
  const tCta = useTranslations("cta");
  const locale = useLocale() as Locale;
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  // Esc to close + lock body scroll while the panel owns the screen.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);

    /*
     * Locking the body hides the scrollbar, and the reclaimed width yanks the
     * whole page sideways at the exact moment the panel starts moving — the
     * jolt reads as the animation stuttering. Holding that width open as
     * padding keeps the page still underneath.
     */
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    // Move focus into the panel for keyboard users.
    const focusTimer = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>("[data-first-focus]")
        ?.focus();
    }, 60);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70]"
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* Darkening + blurring scrim over the page. */}
          <motion.button
            type="button"
            aria-label={t("close")}
            onClick={onClose}
            className="bg-ink/70 absolute inset-0 backdrop-blur-md"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
            transition={{ duration: 0.35, ease }}
          />

          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("menu")}
            className="border-bone/10 absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l px-8 py-8 sm:px-12"
            variants={{
              hidden: {
                x: reduceMotion ? 0 : "100%",
                opacity: reduceMotion ? 0 : 1,
              },
              visible: { x: 0, opacity: 1 },
            }}
            transition={{ duration: 0.45, ease }}
            style={{
              /*
               * Opaque enough that the `backdrop-blur` this used to carry was
               * invisible — nothing shows through 96% — while still forcing the
               * compositor to re-blur the region behind it on every frame of
               * the slide. The scrim behind already supplies the blurred read.
               */
              background:
                "linear-gradient(180deg, rgba(20,19,17,0.97) 0%, rgba(11,11,11,0.99) 100%)",
              willChange: "transform",
            }}
          >
            {/* Header row: brand + close. */}
            <div className="flex items-center justify-between">
              <Image
                src="/harekar-mark.png"
                alt={tBrand("name")}
                width={488}
                height={207}
                className="h-10 w-auto"
              />
              <button
                type="button"
                data-first-focus
                onClick={onClose}
                aria-label={t("close")}
                className="border-bone/15 text-bone/70 hover:border-gold hover:text-gold flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="via-gold/25 mt-8 h-px bg-gradient-to-r from-transparent to-transparent" />

            {/* Large editorial navigation. */}
            <nav className="mt-10 flex flex-1 flex-col gap-1">
              {items.map((item, i) => {
                const isAnchor = item.href.startsWith("#");
                const content = (
                  <span className="group flex items-baseline gap-4">
                    <span className="text-gold/50 group-hover:text-gold w-8 text-xs tracking-widest tabular-nums transition-colors">
                      {item.index}
                    </span>
                    <span className="relative">
                      <span className="font-display text-bone/85 group-hover:text-bone text-3xl font-light transition-colors sm:text-4xl">
                        {t(item.id)}
                      </span>
                      {/* Gold underline sweeps in from the leading edge on hover. */}
                      <span className="bg-gold absolute -bottom-1 left-0 h-px w-0 transition-all duration-300 ease-out group-hover:w-full" />
                    </span>
                  </span>
                );

                /*
                 * The links ride in just behind the panel edge rather than
                 * waiting for it to land. Started late, a stagger this long
                 * outlives the slide and the menu keeps assembling after it
                 * has arrived, which is what makes it feel slow.
                 */
                const motionProps = {
                  initial: reduceMotion ? false : { opacity: 0, x: 24 },
                  animate: { opacity: 1, x: 0 },
                  transition: { delay: 0.1 + i * 0.045, duration: 0.38, ease },
                };

                return (
                  <motion.div key={item.id} {...motionProps} className="py-2.5">
                    {isAnchor ? (
                      <button
                        type="button"
                        onClick={() => onNavigate(item.href)}
                        className="cursor-pointer text-left"
                      >
                        {content}
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className="cursor-pointer"
                      >
                        {content}
                      </Link>
                    )}
                  </motion.div>
                );
              })}
            </nav>

            {/* Footer: CTA + language + branded detail. */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.1 + items.length * 0.045 + 0.05,
                duration: 0.38,
                ease,
              }}
              className="border-bone/10 mt-8 border-t pt-8"
            >
              <Link
                href="/contact"
                onClick={onClose}
                className="bg-gold text-ink hover:bg-gold-bright block w-full cursor-pointer rounded-full py-3.5 text-center text-sm font-medium transition-colors"
              >
                {tCta("primary")}
              </Link>

              <div className="mt-6 flex items-center justify-between">
                <div
                  className="border-bone/15 flex items-center gap-1 rounded-full border p-1"
                  role="group"
                  aria-label={t("language")}
                >
                  {locales.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => onSwitchLocale(code)}
                      aria-current={code === locale}
                      className={`cursor-pointer rounded-full px-3 py-1 text-xs transition-colors ${
                        code === locale
                          ? "bg-gold text-ink"
                          : "text-bone/60 hover:text-bone"
                      }`}
                    >
                      {localeLabels[code]}
                    </button>
                  ))}
                </div>
                <span className="text-bone/30 text-[10px] tracking-[0.3em] uppercase">
                  Iraq · MENA
                </span>
              </div>
            </motion.div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
