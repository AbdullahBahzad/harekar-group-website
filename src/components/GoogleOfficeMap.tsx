"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { offices } from "@/data/offices";

/**
 * Builds the Google Maps embed URL for a place.
 *
 * This is the endpoint `maps?q=…&output=embed` redirects to, addressed
 * directly. Going straight there matters: the `?q=` form answers with a 301
 * carrying `X-Frame-Options: SAMEORIGIN`, and only the destination is
 * framable. Skipping the hop removes both the round trip and any reliance on
 * the browser choosing to evaluate the header on the final response instead
 * of the redirect.
 *
 * `pb` is Google's packed parameter string: place, zoom, then language twice.
 */
function embedUrl(query: string, locale: string) {
  /*
   * Spaces travel as `+` in this parameter, so any literal plus in the query
   * has to be escaped before that substitution — otherwise Duhok's Plus Code
   * `VX9J+P2G` arrives as `VX9J P2G` and resolves to nothing.
   */
  const place = query.replace(/\+/g, "%2B").replace(/\s+/g, "+");
  // Zoom 14: close enough to read the surrounding streets, wide enough that
  // the pin still has a recognisable city around it.
  return `https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1s${place}!6i14!3m1!1s${locale}!5m1!1s${locale}`;
}

/**
 * Google Maps embed for the three offices.
 *
 * Keyless by design — no API key, no billing account, and nothing secret to
 * leak in the client bundle. The trade-off is no styling control: the map
 * arrives in Google's own light palette rather than the site's dark gold.
 *
 * One iframe shared by three tabs instead of three stacked maps: a Maps embed
 * is a heavy third-party frame, and loading three to show one would triple the
 * cost of a page whose real job is the form.
 */
export default function GoogleOfficeMap() {
  const t = useTranslations("contact.offices");
  const locale = useLocale();
  const [active, setActive] = useState(offices[1]?.id ?? offices[0].id);

  const office = offices.find((o) => o.id === active) ?? offices[0];

  /*
   * Coordinates are stored [lon, lat]; Google wants "lat,lng". Getting the
   * pair the wrong way round would still resolve to a real place, just the
   * wrong one — Erbil's would land in the Indian Ocean off Somalia.
   */
  const [lon, lat] = office.coordinates;
  const src = embedUrl(office.mapQuery ?? `${lat},${lon}`, locale);

  return (
    <div>
      {/*
       * Tabs, not a select: three options is few enough that hiding them
       * behind a control would cost more than it saves.
       */}
      <div
        role="tablist"
        aria-label={t("tablistLabel")}
        className="flex flex-wrap gap-2"
      >
        {offices.map((entry) => {
          const selected = entry.id === active;
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="office-map-panel"
              onClick={() => setActive(entry.id)}
              className={`flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm transition-colors ${
                selected
                  ? "border-gold bg-gold text-ink"
                  : "border-bone/20 text-bone/70 hover:border-gold/60 hover:text-gold"
              }`}
            >
              {t(entry.id)}
            </button>
          );
        })}
      </div>

      <div
        id="office-map-panel"
        role="tabpanel"
        className="border-bone/14 mt-4 overflow-hidden rounded-xl border"
      >
        <iframe
          // Re-keyed per office so switching tabs replaces the frame outright
          // rather than leaving the previous map's history behind it.
          key={office.id}
          src={src}
          title={t("mapTitle", { city: t(office.id) })}
          // Grows with the viewport instead of sitting at one fixed height, so
          // the map stays legible rather than letterboxed as the page scales.
          className="block h-[20rem] w-full sm:h-[26rem] lg:h-[32rem]"
          style={{ border: 0 }}
          // Third-party frame: defer it until it is actually near the viewport.
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </div>
  );
}
