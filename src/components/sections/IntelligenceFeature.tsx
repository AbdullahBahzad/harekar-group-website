import type { ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Reveal from "@/components/Reveal";
import RevealImage from "@/components/RevealImage";
import RevealText from "@/components/RevealText";

/**
 * A full-width banner for the company's own intelligence product — the
 * situational-awareness map and the Daily Security Report — over a still of
 * an instructor briefing a team in front of the map screen.
 *
 * Carries the `intelligence` anchor the header scrolls to; `children` (the
 * live map, on the home page) sits on a white band directly beneath it.
 */
export default function IntelligenceFeature({
  children,
  showcase,
  photo = "/photos/map-briefing.jpg",
}: {
  children?: ReactNode;
  /** The "Inside the platform" tour, on navy directly beneath the banner. */
  showcase?: ReactNode;
  /** The banner background — the Media station's upload, or the shipped one. */
  photo?: string;
}) {
  const t = useTranslations("feature");

  return (
    <section id="intelligence" className="scroll-mt-18">
      <div className="tone-navy bg-ink relative isolate overflow-hidden">
        <RevealImage className="absolute inset-0 -z-20">
          <Image
            src={photo}
            alt=""
            fill
            sizes="100vw"
            quality={90}
            className="object-cover object-[70%_center]"
          />
        </RevealImage>
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(22,22,22,0.95)_0%,rgba(22,22,22,0.82)_45%,rgba(22,22,22,0.35)_100%)] rtl:bg-[linear-gradient(270deg,rgba(22,22,22,0.95)_0%,rgba(22,22,22,0.82)_45%,rgba(22,22,22,0.35)_100%)]"
        />

        <div className="mx-auto max-w-360 px-4 py-24 sm:px-6 sm:py-32 lg:px-10">
          <Reveal className="max-w-2xl">
            <p className="text-gold-deep flex items-center gap-3 text-base font-bold">
              <svg viewBox="0 0 20 20" className="size-5" fill="none" aria-hidden>
                <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10 1v3M10 16v3M1 10h3M16 10h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {t("label")}
            </p>
            <RevealText
              text={t("title")}
              className="font-display text-bone mt-4 text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl"
            />
            <p className="text-bone/85 mt-5 text-lg leading-relaxed text-pretty">{t("body")}</p>
            <Link
              href="/intelligence"
              className="bg-bone text-ink hover:bg-gold mt-9 inline-flex min-h-12 items-center rounded-md px-6 text-base font-bold transition-colors"
            >
              {t("cta")}
            </Link>
          </Reveal>
        </div>
      </div>

      {showcase && <div className="tone-navy bg-ink">{showcase}</div>}

      {children && (
        <div
          className="tone-light bg-white px-2 py-16 sm:px-6 sm:py-20 lg:px-10"
          // The map's entrance tilt scales past its frame; keep it from
          // widening the page.
          style={{ overflowX: "clip" }}
        >
          <div className="mx-auto max-w-360">{children}</div>
        </div>
      )}
    </section>
  );
}
