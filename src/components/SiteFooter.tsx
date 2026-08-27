import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { pick, type getSiteContent } from "@/lib/site-content";
import type { Locale } from "@/i18n/routing";

export default function SiteFooter({
  content,
}: {
  /** Fetched by the layout, not here — see the comment there. */
  content: Awaited<ReturnType<typeof getSiteContent>>;
}) {
  const t = useTranslations("footer");
  const tBrand = useTranslations("brand");
  const tCta = useTranslations("cta");
  const tNav = useTranslations("nav");
  const locale = useLocale() as Locale;

  return (
    <footer className="border-bone/10 border-t">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-14 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="font-display text-bone text-lg tracking-[0.18em] uppercase">
            {tBrand("name")}
          </p>
          <p className="text-bone/50 text-sm">
            {pick(content, "footerTagline", locale, t("tagline"))}
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:items-end">
          <div className="flex gap-6">
            <Link
              href="/clients"
              className="text-bone/60 hover:text-gold text-sm transition-colors"
            >
              {tNav("clients")}
            </Link>
            <Link
              href="/careers"
              className="text-bone/60 hover:text-gold text-sm transition-colors"
            >
              {tNav("careers")}
            </Link>
            <Link
              href="/faq"
              className="text-bone/60 hover:text-gold text-sm transition-colors"
            >
              {tNav("faq")}
            </Link>
            <Link
              href="/contact"
              className="text-gold hover:text-gold-bright text-sm transition-colors"
            >
              {tCta("secondary")}
            </Link>
          </div>
          <p className="text-bone/35 text-xs">
            © {new Date().getFullYear()} {tBrand("name")}. {t("rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
