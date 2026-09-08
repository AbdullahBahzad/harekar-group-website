import { useTranslations } from "next-intl";
import Reveal from "@/components/Reveal";
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
}: {
  as?: "h1" | "h2";
  logos: Awaited<ReturnType<typeof getPublishedClients>>;
}) {
  const t = useTranslations("clients");

  return (
    <section id="clients" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
      <Reveal className="max-w-2xl">
        <p className="text-gold text-3xl font-semibold tracking-[0.1em] uppercase sm:text-4xl lg:text-5xl">
          {t("eyebrow")}
        </p>
        <Heading className="font-display text-bone mt-5 text-2xl leading-snug font-normal text-balance sm:text-3xl lg:text-4xl">
          {t("title")}
        </Heading>
        <p className="text-bone/70 mt-6 text-base leading-relaxed text-pretty">
          {t("subtitle")}
        </p>
      </Reveal>

      <Reveal delay={0.1} className="mt-14">
        <ClientWall logos={logos} />
      </Reveal>
    </section>
  );
}
