"use client";

import dynamic from "next/dynamic";
import { severityColor, type MarkerSeverity } from "@/data/iraq";
import type { LeafletPin } from "@/components/IraqLeafletMap";

// Same reasoning as `IraqMap`: Leaflet touches `window` at import time, which
// a server render of this component would hit before the browser ever does.
const IraqLeafletMap = dynamic(() => import("@/components/IraqLeafletMap"), {
  ssr: false,
});

/** One marker, centred and non-interactive — a "you are here" for one report. */
export default function ReportLocationMap({
  lat,
  lng,
  severity,
  label,
  ariaLabel,
}: {
  lat: number;
  lng: number;
  severity: MarkerSeverity;
  label: string;
  ariaLabel: string;
}) {
  const pins: LeafletPin[] = [
    {
      id: "report-location",
      lat,
      lng,
      tone: severityColor[severity],
      label,
      ring: severity !== "clear",
    },
  ];

  return (
    <div className="h-72 w-full overflow-hidden rounded-2xl sm:h-96">
      <IraqLeafletMap markers={pins} maskOutside ariaLabel={ariaLabel} />
    </div>
  );
}
