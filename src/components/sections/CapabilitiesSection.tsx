import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Reveal from "@/components/Reveal";

/**
 * The thirteen service lines, gathered into four areas a buyer recognises.
 * Each card opens the Services page, where every line has its own card.
 */
const areas = [
  { id: "protection", image: "/services/static.webp" },
  { id: "response", image: "/services/crisis.webp" },
  { id: "transport", image: "/services/armored.webp" },
  { id: "site", image: "/services/camp.webp" },
] as const;

/**
 * The home page's services: a heading block, then four tall photo cards in a
 * row — title, one line on what the area covers, and a link onward.
 */
export default function CapabilitiesSection() {
  const t = useTranslations("capabilities");
  const tServices = useTranslations("services");

  return (
    <section id="services" className="scroll-mt-24 bg-white px-4 pt-12 pb-20 sm:px-6 sm:pb-28 lg:px-10">
      <div className="mx-auto max-w-360">
        <Reveal className="max-w-4xl">
          <h2 className="font-display text-bone text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
            {tServices("title")}
          </h2>
          <p className="text-gold-deep mt-2 text-lg font-bold">{t("subtitle")}</p>
          <p className="text-bone/75 mt-4 text-lg leading-relaxed text-pretty">
            {tServices("subtitle")}
          </p>
        </Reveal>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {areas.map((area, i) => (
            <li key={area.id}>
              <Reveal delay={0.06 * i}>
                <Link
                  href="/services"
                  className="group tone-navy focus-visible:ring-gold relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-md outline-none focus-visible:ring-2 sm:aspect-[3/4]"
                >
                  <Image
                    src={area.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-[rgba(16,29,47,0.95)] via-[rgba(16,29,47,0.45)] to-[rgba(16,29,47,0.1)]"
                  />
                  <span className="relative p-6">
                    <span className="font-display text-bone block text-2xl leading-tight font-bold">
                      {t(`items.${area.id}.title`)}
                    </span>
                    <span className="text-bone/85 mt-2 block text-base leading-snug font-semibold">
                      {t(`items.${area.id}.tagline`)}
                    </span>
                    <span className="text-gold-deep mt-4 inline-flex items-center gap-2 text-sm font-bold">
                      {t("view")}
                      <svg
                        viewBox="0 0 16 16"
                        className="size-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
                        fill="none"
                        aria-hidden
                      >
                        <path d="M1 8h14M15 8l-6-6M15 8l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
