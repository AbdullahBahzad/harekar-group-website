import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Reveal from "@/components/Reveal";
import RevealImage from "@/components/RevealImage";
import RevealText from "@/components/RevealText";

/**
 * The reasons, in the order a buyer weighs them. Each one restates something
 * the company already says elsewhere on the site (the FAQ, the services
 * line) — nothing here is a new claim.
 */
const reasons = ["licensed", "vetted", "always", "local", "command", "specialist"] as const;

/**
 * "Why choose Harekar" — a full-bleed split: the company's own photograph of
 * a guard briefing on one half, the case for the company on a navy panel on
 * the other.
 */
export default function WhySection({
  photo = "/photos/training-briefing.jpg",
}: {
  /** The photo beside the reasons — the Media station's upload, or the shipped one. */
  photo?: string;
}) {
  const t = useTranslations("why");

  return (
    <section id="why" className="grid scroll-mt-18 lg:grid-cols-2">
      <div className="relative min-h-72 sm:min-h-96 lg:min-h-full">
        <RevealImage>
          <Image
            src={photo}
            alt={t("photoAlt")}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            quality={90}
            className="object-cover object-[center_80%]"
          />
        </RevealImage>
      </div>

      <div className="tone-navy bg-ink px-6 py-16 sm:px-10 sm:py-20 lg:px-16 xl:px-20">
        <Reveal className="max-w-2xl">
          <p className="text-gold-deep text-base font-bold">{t("eyebrow")}</p>
          <RevealText
            text={t("title")}
            className="font-display text-bone mt-3 text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl"
          />
          <p className="text-bone/80 mt-4 text-lg leading-relaxed text-pretty">
            {t("subtitle")}
          </p>

          <ul className="mt-9 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {reasons.map((id) => (
              <li key={id} className="flex gap-3">
                <svg viewBox="0 0 20 20" className="text-gold mt-1 size-5 shrink-0" fill="none" aria-hidden>
                  <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="m6.5 10.2 2.3 2.3 4.7-4.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div>
                  <p className="text-bone text-base font-bold">{t(`items.${id}.title`)}</p>
                  <p className="text-bone/70 mt-1 text-[15px] leading-relaxed">
                    {t(`items.${id}.body`)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <Link
            href="/about"
            className="border-bone/70 text-bone hover:bg-bone hover:text-ink mt-10 inline-flex min-h-12 items-center rounded-md border-2 px-6 text-base font-bold transition-colors"
          >
            {t("cta")}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
