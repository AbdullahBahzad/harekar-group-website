import { getTranslations } from "next-intl/server";
import { getPublishedMarkers } from "@/lib/intel";
import IraqMap from "@/components/IraqMap";
import MapStage from "@/components/MapStage";
import Reveal from "@/components/Reveal";
import ParticleNetwork from "@/components/ui/particle-network";

/**
 * Shared by the one-page scroll and the standalone /intelligence route.
 * `as` lets the standalone page promote the heading to an h1.
 */
export default async function IntelligenceSection({
  as: Heading = "h2",
}: {
  as?: "h1" | "h2";
}) {
  const t = await getTranslations("intelligence");
  const markers = await getPublishedMarkers();

  return (
    <section
      id="intelligence"
      className="relative scroll-mt-24 px-6 py-28"
      // Radar/ring decorations scale past the frame during their entrance;
      // clip horizontally so they never create page-level overflow.
      style={{ overflowX: "clip" }}
    >
      {/* Live signal field behind the intelligence picture. */}
      <ParticleNetwork />

      <div className="relative z-10 mx-auto max-w-7xl">
        <Reveal>
          <p className="text-gold/80 text-xs tracking-[0.35em] uppercase">
            {t("eyebrow")}
          </p>
          <Heading className="font-display text-bone mt-6 max-w-3xl text-4xl leading-[1.15] font-light text-balance sm:text-5xl lg:text-6xl">
            {t("title")}
          </Heading>
          <p className="text-bone/60 mt-6 max-w-2xl text-base leading-relaxed text-pretty">
            {t("subtitle")}
          </p>
        </Reveal>

        {/*
         * Bleeds past the section's own side padding on phones, where every
         * pixel of width is worth more to the map than to the alignment of
         * the heading text above it.
         */}
        <div className="mt-14 -mx-3 sm:mx-0">
          <MapStage>
            <IraqMap markers={markers} />
          </MapStage>
        </div>
      </div>
    </section>
  );
}
