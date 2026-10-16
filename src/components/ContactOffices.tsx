"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { COMPANY_EMAIL, offices } from "@/data/offices";
import { cn } from "@/lib/utils";

/**
 * Builds the Google Maps embed URL for a place.
 *
 * This is the endpoint `maps?q=…&output=embed` redirects to, addressed
 * directly. The `?q=` form answers with a 301 carrying
 * `X-Frame-Options: SAMEORIGIN`, and only the destination is framable.
 *
 * `pb` is Google's packed parameter string: place, zoom, then language twice.
 */
function embedUrl(query: string, locale: string) {
  /*
   * Spaces travel as `+` in this parameter, so a literal plus has to be
   * escaped first — otherwise Duhok's Plus Code `VX9J+P2G` arrives as
   * `VX9J P2G` and resolves to nothing.
   */
  const place = query.replace(/\+/g, "%2B").replace(/\s+/g, "+");
  return `https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1s${place}!6i14!3m1!1s${locale}!5m1!1s${locale}`;
}

/** Tab order, as on the company's own site, with Zakho added last. */
const TAB_ORDER = ["erbil", "duhok", "sulaymaniyah", "zakho"];
const tabs = [...offices].sort((a, b) => TAB_ORDER.indexOf(a.id) - TAB_ORDER.indexOf(b.id));

/**
 * The contact block: a tab per office above, the enquiry form (`children`)
 * on one side and the chosen office's map on the other.
 *
 * Keyless Google Maps embed — no API key and nothing secret in the bundle —
 * and one iframe shared by every tab rather than one per office, since a Maps
 * frame is heavy and only one is ever looked at.
 */
export default function ContactOffices({ children }: { children: ReactNode }) {
  const t = useTranslations("contact.offices");
  const locale = useLocale();
  const [active, setActive] = useState(tabs[0].id);

  /*
   * `#contact-<office>` in the address (linked from the header's Contact
   * menu) opens on that office's tab.
   */
  useEffect(() => {
    function sync() {
      const id = window.location.hash.replace(/^#contact-/, "");
      const match = tabs.find((o) => o.id === id);
      if (match) setActive(match.id);
    }
    queueMicrotask(sync);
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const office = offices.find((o) => o.id === active) ?? offices[0];

  // Coordinates are stored [lon, lat]; Google wants "lat,lng".
  const [lon, lat] = office.coordinates;
  const src = embedUrl(office.mapQuery ?? `${lat},${lon}`, locale);

  return (
    <div className="relative">
      {/* Scroll targets for the office links. */}
      {tabs.map((o) => (
        <span key={o.id} id={`contact-${o.id}`} aria-hidden className="absolute top-0 scroll-mt-28" />
      ))}
      <div className="flex justify-center">
        <div
          role="tablist"
          aria-label={t("tablistLabel")}
          className="bg-surface border-bone/10 inline-flex max-w-full flex-wrap justify-center gap-1 rounded-2xl border p-1.5"
        >
          {tabs.map((entry) => {
            const selected = entry.id === active;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="office-map-panel"
                onClick={() => setActive(entry.id)}
                className={cn(
                  "min-h-11 min-w-28 cursor-pointer rounded-xl px-5 text-base font-bold transition-colors",
                  selected ? "bg-gold text-ink shadow-sm" : "text-bone/70 hover:bg-white hover:text-bone",
                )}
              >
                {t(entry.id)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-stretch">
        <div className="bg-surface border-bone/10 rounded-3xl border p-6 sm:p-8">{children}</div>

        <div
          id="office-map-panel"
          role="tabpanel"
          className="border-bone/10 min-h-[22rem] overflow-hidden rounded-3xl border lg:min-h-0"
        >
          <iframe
            // Re-keyed per office so switching replaces the frame outright.
            key={office.id}
            src={src}
            title={t("mapTitle", { city: t(office.id) })}
            className="block h-full min-h-[22rem] w-full"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>

      {/* One shared inbox for every office. */}
      <p className="text-bone/75 mt-6 text-center text-base">
        {t("emailLabel")}:{" "}
        <a
          href={`mailto:${COMPANY_EMAIL}`}
          dir="ltr"
          className="text-bone hover:text-gold-deep font-bold underline-offset-4 transition-colors hover:underline"
        >
          {COMPANY_EMAIL}
        </a>
      </p>
    </div>
  );
}
