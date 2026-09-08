import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { getPublishedMarkers } from "@/lib/intel";
import IraqOpenMap from "@/components/IraqOpenMap";
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

  /*
   * Entitlement is resolved here, on the server, and decides what is put in the
   * payload at all. The map reads the session too, but only to choose which
   * words to show — see the note in `IraqMap`. The two are not redundant: this
   * one is the gate, that one is the label on it.
   *
   * `session.user.isPro` is already the resolved entitlement rather than the
   * raw comped flag (`auth.ts` runs it through `hasProAccess`), so a purchased
   * subscription counts here exactly as a comped one does.
   */
  const session = await auth();
  const markers = await getPublishedMarkers(Boolean(session?.user?.isPro));

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
          <p className="text-gold text-3xl font-semibold tracking-[0.1em] uppercase sm:text-4xl lg:text-5xl">
            {t("eyebrow")}
          </p>
          <Heading className="font-display text-bone mt-5 max-w-3xl text-2xl leading-snug font-normal text-balance sm:text-3xl lg:text-4xl">
            {t("title")}
          </Heading>
          <p className="text-bone/70 mt-6 max-w-2xl text-base leading-relaxed text-pretty">
            {t("subtitle")}
          </p>
        </Reveal>

        {/*
         * Bleeds past the section's own side padding on phones, where every
         * pixel of width is worth more to the map than to the alignment of
         * the heading text above it.
         */}
        <div className="mt-14 -mx-3 sm:mx-0">
          {/*
           * Not tilted. `MapStage`'s scroll-driven rotateX is an entrance for a
           * picture; on a map you drag and pinch it puts the surface at an
           * angle to the pointer and every gesture lands off target. The radar
           * geometry behind it still plays.
           */}
          <MapStage tilt={false}>
            <IraqOpenMap markers={markers} />
          </MapStage>
        </div>
      </div>
    </section>
  );
}
