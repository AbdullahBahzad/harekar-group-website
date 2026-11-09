"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { LeafletArea, LeafletPin } from "@/components/IraqLeafletMap";
import { governorateShapes } from "@/data/iraq-governorates";
import { eventPin } from "@/lib/report-geo";
import { REPORT_CATEGORIES, type ReportNewsItem } from "@/lib/report-shape";
import {
  CATEGORY_COLOR_DARK as CATEGORY_COLOR,
  categoryColorDark as categoryColor,
} from "@/lib/pdf/report-labels";
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
export default function ReportEventMap({
  items,
  compact = false,
}: {
  items: ReportNewsItem[];
  /** The Daily Brief's side column: a shorter map. */
  compact?: boolean;
}) {
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

  /*
   * The governorates the events fall in, lightly shaded. Besides showing where
   * the day's activity sits, giving the map areas makes it frame them, so it
   * opens zoomed to the events rather than on the whole country. Memoised: the
   * map re-frames whenever this array changes identity.
   */
  const governorateKey = [...new Set(items.map((item) => item.governorate).filter(Boolean))]
    .sort()
    .join(",");
  const areas = useMemo<LeafletArea[]>(
    () =>
      governorateShapes
        .filter((shape) => governorateKey.split(",").includes(shape.key))
        .map((shape) => ({ id: shape.key, rings: shape.rings, tone: "var(--color-gold)" })),
    [governorateKey],
  );

  if (pins.length === 0) return null;

  const shown = REPORT_CATEGORIES.filter((category) =>
    items.some((item) => item.category === category),
  );

  return (
    <div>
      <div
        className={`w-full overflow-hidden rounded-2xl ${compact ? "h-72" : "h-80 sm:h-[28rem]"}`}
      >
        <IraqLeafletMap
          markers={pins}
          areas={areas.length > 0 ? areas : undefined}
          maskOutside
          ariaLabel={t("eventMap")}
        />
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
