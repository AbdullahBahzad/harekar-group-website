import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { getPublishedMarkers } from "@/lib/intel";
import IraqMap from "@/components/IraqMap";
import MapStage from "@/components/MapStage";
import SectionIntro from "@/components/SectionIntro";

/**
 * Shared by the one-page scroll and the standalone /intelligence route.
 * `as` lets the standalone page promote the heading to an h1.
 *
 * On the light page the basemap keeps its natural colours (see the
 * `.tone-light .iraq-leaflet` rules in globals.css).
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
      className="relative scroll-mt-24 bg-white px-4 py-20 sm:px-6 sm:py-24"
      // The map's entrance tilt scales past the frame; clip horizontally so
      // it never creates page-level overflow.
      style={{ overflowX: "clip" }}
    >
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          as={Heading}
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={t("subtitle")}
        />

        <div className="mt-12 -mx-2 sm:mx-0">
          <MapStage>
            <IraqMap markers={markers} />
          </MapStage>
        </div>
      </div>
    </section>
  );
}
