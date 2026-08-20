import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Reveal from "@/components/Reveal";
import { GradientCard } from "@/components/ui/gradient-card";
import ApplyForm from "./ApplyForm";

/** The five reasons carried over from the previous site, in their original order. */
const benefits = [
  "environment",
  "development",
  "collaboration",
  "projects",
  "excellence",
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "careers" });
  return { title: t("eyebrow"), description: t("benefits.environment.body") };
}

export default async function CareersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <Careers />;
}

function Careers() {
  const t = useTranslations("careers");
  const tApply = useTranslations("careers.apply");

  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-24 pb-16">
        <Reveal className="max-w-3xl">
          <p className="text-gold/80 text-xs tracking-[0.35em] uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="font-display text-bone mt-6 text-4xl leading-[1.15] font-light text-balance sm:text-5xl">
            {t("title")}
          </h1>
          <a
            href="#apply"
            className="border-gold/50 text-gold hover:bg-gold hover:text-ink mt-10 inline-flex min-h-11 items-center rounded-full border px-7 text-sm transition-colors"
          >
            {tApply("title")}
          </a>
        </Reveal>

        {/*
         * The old site paged these five through a carousel, which hid four of
         * them behind arrows and gave the page no scannable shape. They are all
         * short, so a grid shows the whole argument for joining at once.
         */}
        {/* Five across on desktop so the whole argument reads as one line;
            stacking only where 200px-wide columns would stop being legible. */}
        <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {benefits.map((key, i) => (
            <li key={key} className="h-full">
              <Reveal delay={0.06 * i} className="h-full">
                <GradientCard
                  index={String(i + 1).padStart(2, "0")}
                  title={t(`benefits.${key}.title`)}
                  body={t(`benefits.${key}.body`)}
                />
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section id="apply" className="scroll-mt-24 px-6 pt-8 pb-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-20">
          <Reveal>
            <p className="text-gold/80 text-xs tracking-[0.35em] uppercase">
              {tApply("eyebrow")}
            </p>
            <h2 className="font-display text-bone mt-6 text-3xl leading-tight font-light text-balance sm:text-4xl">
              {tApply("title")}
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <ApplyForm />
          </Reveal>
        </div>
      </section>
    </>
  );
}
