import { useTranslations } from "next-intl";
import Reveal from "@/components/Reveal";
import { offices, type Office } from "@/data/offices";
import { iraqBorder, type LngLat } from "@/data/iraq";

/*
 * ---- The region map drawn in each tile -----------------------------------
 *
 * The Kurdistan Region, cropped out of the real national border in
 * `data/iraq.ts`. Plain equirectangular, with longitude scaled by cos(36°) so
 * the shapes are not stretched sideways at this latitude.
 */
const VIEW = { minLon: 41.6, maxLon: 46.6, minLat: 34.2, maxLat: 37.6 };
const LON_SCALE = Math.cos((36 * Math.PI) / 180);
const W = (VIEW.maxLon - VIEW.minLon) * LON_SCALE * 100;
const H = (VIEW.maxLat - VIEW.minLat) * 100;

function project([lon, lat]: LngLat): [number, number] {
  return [(lon - VIEW.minLon) * LON_SCALE * 100, (VIEW.maxLat - lat) * 100];
}

const borderPath =
  iraqBorder
    .map((point, i) => {
      const [x, y] = project(point);
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join("") + "Z";

/** The office's own Google Maps listing, opened in a new tab. */
function mapsUrl(office: Office) {
  const [lon, lat] = office.coordinates;
  const query = office.mapQuery ?? `${lat},${lon}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function RegionMap({ highlight }: { highlight: Office["id"] }) {
  return (
    <svg
      viewBox={`0 0 ${W.toFixed(0)} ${H.toFixed(0)}`}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full transition-transform duration-700 ease-out group-hover:scale-105"
      aria-hidden
    >
      <defs>
        <pattern id={`dots-${highlight}`} width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.9" fill="rgba(255,255,255,0.09)" />
        </pattern>
        <radialGradient id={`glow-${highlight}`}>
          <stop offset="0%" stopColor="rgba(205,178,126,0.55)" />
          <stop offset="100%" stopColor="rgba(205,178,126,0)" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill={`url(#dots-${highlight})`} />
      <path
        d={borderPath}
        fill="rgba(255,255,255,0.07)"
        stroke="rgba(184,154,96,0.55)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {offices.map((office) => {
        const [x, y] = project(office.coordinates);
        const on = office.id === highlight;
        return on ? (
          <g key={office.id}>
            <circle cx={x} cy={y} r="70" fill={`url(#glow-${highlight})`} />
            <circle cx={x} cy={y} r="16" fill="none" stroke="#cdb27e" strokeWidth="2" opacity="0.6" />
            <circle cx={x} cy={y} r="8" fill="#cdb27e" />
          </g>
        ) : (
          <circle key={office.id} cx={x} cy={y} r="5" fill="rgba(255,255,255,0.55)" />
        );
      })}
    </svg>
  );
}

/**
 * "Where we operate" — one tile per regional office, each a navy map of the
 * Kurdistan Region with that city lit, and the Quick Reaction Force that
 * covers everywhere else beneath them.
 */
export default function CoverageSection() {
  const t = useTranslations("coverage");
  const tOffices = useTranslations("contact.offices");

  return (
    <section id="coverage" className="scroll-mt-24 bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-10">
      <div className="mx-auto max-w-360">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-bone text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
            {t("where")}
          </h2>
          <p className="text-bone/75 mt-4 text-lg leading-relaxed text-pretty">
            {t("subtitle")}
          </p>
        </Reveal>

        <ul className="mt-10 grid gap-3 md:grid-cols-3">
          {offices.map((office, i) => (
            <li key={office.id}>
              <Reveal delay={0.06 * i}>
                <a
                  href={mapsUrl(office)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group tone-navy bg-ink focus-visible:ring-gold relative flex aspect-[4/3] items-end overflow-hidden rounded-md outline-none focus-visible:ring-2"
                >
                  <RegionMap highlight={office.id} />
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[rgba(16,29,47,0.9)] to-transparent"
                  />
                  <span className="relative flex w-full items-center justify-between gap-3 p-6">
                    <span>
                      <span className="font-display text-bone block text-2xl font-bold">
                        {tOffices(office.id)}
                      </span>
                      <span className="text-bone/75 block text-sm font-medium">{t("office")}</span>
                    </span>
                    <span className="bg-gold text-ink flex size-10 shrink-0 items-center justify-center rounded-full transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                      <svg viewBox="0 0 16 16" className="size-4 rtl:rotate-180" fill="none" aria-hidden>
                        <path d="M1 8h14M15 8l-6-6M15 8l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </span>
                  <span className="sr-only">{t("openMap")}</span>
                </a>
              </Reveal>
            </li>
          ))}
        </ul>

        <Reveal delay={0.1}>
          <p className="border-bone/12 bg-surface text-bone/80 mt-3 flex items-start gap-3 rounded-md border px-6 py-5 text-base leading-relaxed sm:items-center">
            <svg viewBox="0 0 20 20" className="text-gold-deep mt-0.5 size-5 shrink-0 sm:mt-0" fill="none" aria-hidden>
              <path d="M11 2 4 11.5h5L8 18l7-9.5h-5L11 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span>
              <strong className="text-bone font-bold">{t("qrfTitle")}.</strong> {t("qrfBody")}
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
