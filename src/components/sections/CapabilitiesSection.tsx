import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Reveal from "@/components/Reveal";
import RevealText from "@/components/RevealText";
import { getPublishedServices, type ResolvedService } from "@/lib/services";

/** One service as a card in the drifting row: photo, area, title, line. */
function ServiceCard({
  service,
  groupLabel,
  comingSoonLabel,
  hidden = false,
}: {
  service: ResolvedService;
  groupLabel: string;
  comingSoonLabel: string;
  /** The loop's second copy: present for the eye, skipped by tab and readers. */
  hidden?: boolean;
}) {
  return (
    <li
      className="border-bone/12 w-72 shrink-0 border-s px-4 sm:w-80 sm:px-5"
      aria-hidden={hidden || undefined}
    >
      <Link
        // Opens this service's details and photos on the services page.
        href={`/services#service-${service.slug}`}
        tabIndex={hidden ? -1 : undefined}
        className="group focus-visible:ring-gold block rounded-sm outline-none focus-visible:ring-2"
      >
        <span className="relative block aspect-[4/3] overflow-hidden rounded-sm">
          <Image
            src={service.imageUrl}
            alt=""
            fill
            sizes="20rem"
            quality={90}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
          {service.comingSoon && (
            <span className="bg-gold text-ink absolute start-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide uppercase shadow">
              {comingSoonLabel}
            </span>
          )}
        </span>
        <span className="text-gold-deep mt-4 block text-sm font-bold">{groupLabel}</span>
        <span className="font-display text-bone group-hover:text-gold-deep mt-1 block text-lg leading-snug font-bold transition-colors">
          {service.title}
        </span>
        <span className="text-bone/70 mt-2 line-clamp-2 block text-[15px] leading-relaxed">
          {service.description}
        </span>
      </Link>
    </li>
  );
}

/**
 * The home page's services, after the reference site's pattern: a headline
 * that ends on a gold accent with a short line and a link beside it, then
 * every service line as a photo card in a row that drifts sideways on its
 * own and stops while the reader hovers over it.
 */
export default async function CapabilitiesSection() {
  const t = await getTranslations("capabilities");
  const tServices = await getTranslations("services");
  const locale = await getLocale();
  const services = await getPublishedServices(locale);

  const groupLabel = (group: string) =>
    tServices.has(`groups.${group}`) ? tServices(`groups.${group}`) : "";

  return (
    <section id="services" className="scroll-mt-24 overflow-hidden bg-white pt-12 pb-20 sm:pb-28">
      <div className="mx-auto max-w-360 px-4 sm:px-6 lg:px-10">
        <hr className="border-bone/12 mb-12" />
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-16">
          <div className="lg:col-span-7">
            <Reveal>
              <p className="text-gold-deep text-base font-bold">{tServices("eyebrow")}</p>
            </Reveal>
            <RevealText
              text={tServices("title")}
              highlight={t("subtitle")}
              className="font-display text-bone mt-3 text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl"
            />
          </div>
          <Reveal delay={0.1} className="lg:col-span-5">
            <p className="text-bone/80 text-lg leading-relaxed text-pretty">
              {tServices("subtitle")}
            </p>
            <Link
              href="/services"
              className="text-bone hover:text-gold-deep group mt-4 inline-flex min-h-11 items-center gap-2 text-base font-bold transition-colors"
            >
              {t("viewAll")}
              <svg
                viewBox="0 0 16 16"
                className="size-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
                fill="none"
                aria-hidden
              >
                <path d="M1 8h14M15 8l-6-6M15 8l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </Reveal>
        </div>
      </div>

      <Reveal delay={0.15} className="mt-14">
        <div
          className="marquee"
          style={{ ["--marquee-duration" as string]: `${services.length * 6}s` }}
        >
          <ul className="marquee-track">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                groupLabel={groupLabel(service.group)}
                comingSoonLabel={tServices("comingSoon")}
              />
            ))}
            {services.map((service) => (
              <ServiceCard
                key={`${service.id}-loop`}
                service={service}
                groupLabel={groupLabel(service.group)}
                comingSoonLabel={tServices("comingSoon")}
                hidden
              />
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
