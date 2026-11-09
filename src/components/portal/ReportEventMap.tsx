"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { LeafletPin } from "@/components/IraqLeafletMap";
import { eventPin } from "@/lib/report-geo";
import { REPORT_CATEGORIES, type ReportNewsItem } from "@/lib/report-shape";
import { CATEGORY_COLOR, categoryColor } from "@/lib/pdf/report-labels";
import { orderReportEvents } from "@/lib/report-order";

// Leaflet touches `window` at import time — see `ReportLocationMap`.
const IraqLeafletMap = dynamic(() => import("@/components/IraqLeafletMap"), {
  ssr: false,
});

/**
 * One report's events on the interactive map: a pin per event, coloured by
 * report section, labelled with the same number the report gives it. Events
 * placed only by governorate are drawn hollow at the governorate's centre.
 */
export default function ReportEventMap({ items }: { items: ReportNewsItem[] }) {
  const t = useTranslations("reportVocab");

  // Numbered as the report prints them — see `orderReportEvents`.
  const pins: LeafletPin[] = orderReportEvents(items).numbered.flatMap(({ item, number }) => {
    const pin = eventPin(item);
    if (!pin) return [];
    return [
      {
        id: `event-${number}`,
        lat: pin.lat,
        lng: pin.lng,
        tone: categoryColor(item.category),
        label: `${number}. ${item.title}`,
        dim: pin.approximate,
        ring: item.category === "SECURITY",
      },
    ];
  });

  if (pins.length === 0) return null;

  const shown = REPORT_CATEGORIES.filter((category) =>
    items.some((item) => item.category === category),
  );

  return (
    <div>
      <div className="h-80 w-full overflow-hidden rounded-2xl sm:h-[28rem]">
        <IraqLeafletMap markers={pins} maskOutside ariaLabel={t("eventMap")} />
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {shown.map((category) => (
          <li key={category} className="text-bone/60 flex items-center gap-1.5 text-xs">
            <span
              aria-hidden
              className="inline-block size-2.5 rounded-full"
              style={{ background: CATEGORY_COLOR[category] }}
            />
            {t(`categories.${category}`)}
          </li>
        ))}
      </ul>
      {pins.some((pin) => pin.dim) && (
        <p className="text-bone/45 mt-2 text-xs">{t("approximateNote")}</p>
      )}
    </div>
  );
}
