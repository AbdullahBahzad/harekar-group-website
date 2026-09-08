"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { locales, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Language names written in their own script.
 *
 * A language list should always be autonyms — a reader who cannot read the
 * current interface language still needs to find their own, and "Arabic"
 * written in English helps exactly the person who does not need help.
 */
const localeNames: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  ckb: "کوردی",
};

/** The compact label shown on the trigger, where there is no room for a name. */
const localeShort: Record<Locale, string> = {
  en: "EN",
  ar: "ع",
  ckb: "کوردی",
};

/**
 * The language control: shows the current language, opens to offer the others.
 *
 * Replaces a row of three always-visible buttons. Three was already the widest
 * cluster in the header, and it presented every option at equal weight even
 * though two of them are, for any given reader, the wrong answer. Collapsing
 * to the current value is the standard pattern for a setting whose current
 * state matters more than its alternatives.
 */
export default function LocaleSwitcher({
  onSelect,
  className,
}: {
  /** Performs the actual route swap; owned by the header. */
  onSelect: (locale: Locale) => void;
  className?: string;
}) {
  const t = useTranslations("nav");
  const current = useLocale() as Locale;
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={t("language")}
        className={cn(
          "border-border text-bone/75 hover:border-gold/60 hover:text-gold focus-visible:ring-ring data-[state=open]:border-gold/60 data-[state=open]:text-gold flex h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-xs tracking-[0.15em] uppercase outline-none transition-colors duration-300 focus-visible:ring-2",
          className,
        )}
      >
        {/* Globe. Inline SVG rather than an icon package — this is the only
            icon the header needs, and it is not worth a dependency. */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z" />
        </svg>

        <span>{localeShort[current]}</span>

        {/* Chevron rotates to report the popover's state. */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "size-3 transition-transform duration-300",
            open && "rotate-180",
          )}
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-52">
        <div role="group" aria-label={t("language")} className="flex flex-col">
          {locales.map((code) => {
            const active = code === current;
            return (
              <button
                key={code}
                type="button"
                lang={code}
                aria-current={active ? "true" : undefined}
                onClick={() => {
                  setOpen(false);
                  // Skip the navigation entirely when nothing would change.
                  if (!active) onSelect(code);
                }}
                className={cn(
                  "focus-visible:ring-ring flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-start text-sm outline-none transition-colors focus-visible:ring-2",
                  active
                    ? "text-gold bg-accent"
                    : "text-bone/70 hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <span>{localeNames[code]}</span>

                {/*
                 * A check, not just colour — the current language has to be
                 * identifiable without relying on hue alone.
                 */}
                {active && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4 shrink-0"
                    aria-hidden
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
