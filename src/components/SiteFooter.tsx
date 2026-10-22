import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CAREERS_EMAIL, COMPANY_EMAIL } from "@/data/offices";
import { pick, type getSiteContent } from "@/lib/site-content";
import type { Locale } from "@/i18n/routing";

/** Every page that has its own route, in reading order. */
const pages = [
  "about",
  "services",
  "clients",
  "intelligence",
  "careers",
  "faq",
  "contact",
] as const;

/*
 * TODO: phone numbers and social profiles are not on record yet. Add them
 * here once Harekar Group confirms them; nothing renders until they are set.
 */
const PHONES: string[] = [];
const SOCIAL: { label: string; href: string }[] = [];

/**
 * Navy footer: brand and contact details on one side, the quick links in two
 * columns on the other, and a darker bar beneath with the legal line.
 */
export default function SiteFooter({
  content,
}: {
  /** Fetched by the layout, not here — see the comment there. */
  content: Awaited<ReturnType<typeof getSiteContent>>;
}) {
  const t = useTranslations("footer");
  const tBrand = useTranslations("brand");
  const tNav = useTranslations("nav");
  const tOffices = useTranslations("contact.offices");
  const locale = useLocale() as Locale;

  return (
    <footer className="tone-navy bg-ink">
      <div className="mx-auto flex max-w-360 flex-col gap-12 px-4 py-16 sm:px-6 lg:flex-row lg:justify-between lg:px-10">
        <div className="max-w-sm">
          <Link href="/" className="inline-flex items-center gap-3" aria-label={tBrand("name")}>
            <Image src="/harekar-mark.png" alt="" width={488} height={207} className="h-10 w-auto" />
            <span className="font-display text-bone text-xl font-bold">{tBrand("name")}</span>
          </Link>
          <p className="text-bone/75 mt-4 text-base leading-relaxed">
            {pick(content, "footerTagline", locale, t("tagline"))}
          </p>

          <ul className="text-bone/90 mt-6 space-y-2.5 text-base">
            {PHONES.map((phone) => (
              <li key={phone}>
                <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} dir="ltr" className="hover:text-gold-deep transition-colors">
                  {phone}
                </a>
              </li>
            ))}
            <li className="flex items-center gap-2.5">
              <svg viewBox="0 0 20 20" className="text-gold size-4 shrink-0" fill="none" aria-hidden>
                <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="m3 5.5 7 5.5 7-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              <a href={`mailto:${COMPANY_EMAIL}`} dir="ltr" className="hover:text-gold-deep transition-colors">
                {COMPANY_EMAIL}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <svg viewBox="0 0 20 20" className="text-gold size-4 shrink-0" fill="none" aria-hidden>
                <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="m3 5.5 7 5.5 7-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              <span>
                {tNav("careers")}:{" "}
                <a href={`mailto:${CAREERS_EMAIL}`} dir="ltr" className="hover:text-gold-deep transition-colors">
                  {CAREERS_EMAIL}
                </a>
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <svg viewBox="0 0 20 20" className="text-gold size-4 shrink-0" fill="none" aria-hidden>
                <path d="M10 17.5s5.5-4.6 5.5-9a5.5 5.5 0 0 0-11 0c0 4.4 5.5 9 5.5 9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="10" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              {tOffices("erbil")} · {tOffices("duhok")} · {tOffices("sulaymaniyah")} · {tOffices("zakho")}
            </li>
          </ul>

          {SOCIAL.length > 0 && (
            <ul className="mt-6 flex gap-4">
              {SOCIAL.map((s) => (
                <li key={s.href}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-bone/80 hover:text-gold-deep text-sm font-semibold">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <nav aria-label={t("pages")}>
          <p className="text-bone text-lg font-bold">{t("pages")}</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-12 gap-y-1">
            {pages.map((page) => (
              <li key={page}>
                <Link
                  href={`/${page}`}
                  className="text-bone/80 hover:text-bone inline-flex min-h-10 items-center text-base transition-colors"
                >
                  {tNav(page)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="bg-[#0e0e0e]">
        <p className="text-bone/65 mx-auto max-w-360 px-4 py-5 text-center text-sm sm:px-6 lg:px-10">
          {/* The year the company asked for, not the current one. */}
          © 2008 {tBrand("name")}. {t("rights")}
        </p>
      </div>
    </footer>
  );
}
