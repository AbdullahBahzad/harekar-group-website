import { useTranslations } from "next-intl";
import Reveal from "@/components/Reveal";
import { Link } from "@/i18n/navigation";
import SectionIntro from "@/components/SectionIntro";
import ClientWall from "@/app/[locale]/(site)/clients/ClientWall";
import type { getPublishedClients } from "@/lib/clients";

/**
 * Shared by the one-page scroll and the standalone /clients route.
 * `as` lets the standalone page promote the heading to an h1.
 *
 * `logos` is fetched by the caller rather than here: mixing an `await` with
 * `useTranslations` in the same component crashes React ("Expected a suspended
 * thenable"), the same constraint `SiteLayout` documents.
 */
export default function ClientsSection({
  as: Heading = "h2",
  logos,
  showAllLink = false,
}: {
  as?: "h1" | "h2";
  logos: Awaited<ReturnType<typeof getPublishedClients>>;
  /** The home page links onward to the full /clients page. */
  showAllLink?: boolean;
}) {
  const t = useTranslations("clients");

  return (
    <section id="clients" className="bg-surface scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-10">
      <div className="mx-auto max-w-360">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionIntro
            as={Heading}
            eyebrow={t("eyebrow")}
            title={t("title")}
            subtitle={t("subtitle")}
          />
          {showAllLink && (
            <Link
              href="/clients"
              className="text-bone hover:text-gold-deep group inline-flex min-h-11 shrink-0 items-center gap-2 text-base font-bold transition-colors"
            >
              {t("viewAll")}
              <span className="bg-ink text-bone flex size-7 items-center justify-center rounded-full">
                <svg viewBox="0 0 16 16" className="size-3.5 rtl:rotate-180" fill="none" aria-hidden>
                  <path d="M1 8h14M15 8l-6-6M15 8l-6 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          )}
        </div>

        <Reveal delay={0.1} className="mt-12">
          <ClientWall logos={logos} />
        </Reveal>
      </div>
    </section>
  );
}
