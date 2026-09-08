import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import Reveal from "@/components/Reveal";

/**
 * The closing pitch on the intelligence page.
 *
 * `/pro` handles the signed-out visitor itself — it offers registration in
 * place of checkout — so this links there either way rather than branching on
 * the session. It is hidden from a reader who already has Pro, for whom
 * "Get Pro" would be an invitation to buy what they are already paying for.
 */
export default async function ProCtaSection() {
  const t = await getTranslations("intelligence.cta");

  const session = await auth();
  if (session?.user?.isPro) return null;

  return (
    <section className="px-6 pt-4 pb-28">
      {/*
       * A ruled band rather than a panel: hairlines above and below, no fill
       * and no corners, so it reads as a line across the page instead of a
       * second card competing with the sections either side of it.
       */}
      <Reveal className="border-gold/25 mx-auto flex max-w-5xl flex-col gap-7 border-y py-9 sm:flex-row sm:items-center sm:justify-between sm:gap-10 sm:py-8">
        <div className="min-w-0">
          <h2 className="font-display text-bone text-xl leading-snug font-light text-balance sm:text-2xl">
            {t("title")}
          </h2>
          <p className="text-bone/65 mt-2 max-w-xl text-sm leading-relaxed text-pretty">
            {t("body")}
          </p>
        </div>
        <Link
          href="/pro"
          className="bg-gold text-ink hover:bg-gold-bright shrink-0 self-start rounded-full px-10 py-4 text-base font-semibold tracking-wide transition-colors sm:self-auto sm:px-12 sm:text-lg"
        >
          {t("button")}
        </Link>
      </Reveal>
    </section>
  );
}
