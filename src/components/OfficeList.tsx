import { useTranslations } from "next-intl";
import { COMPANY_EMAIL, offices } from "@/data/offices";

/**
 * The three offices as text, beneath the map.
 *
 * Each detail line renders only when that field is actually set, so an office
 * whose address or phone has not been confirmed shows its name alone rather
 * than an empty label or a plausible-looking guess.
 */
export default function OfficeList() {
  const t = useTranslations("contact.offices");

  return (
    <>
      <ul className="space-y-6">
        {offices.map((office) => (
          <li key={office.id} className="border-bone/10 border-t pt-4">
            <p className="font-display text-bone text-base tracking-wide">
              {t(office.id)}
            </p>

            {office.address && (
              <p className="text-bone/50 mt-2 text-sm leading-relaxed">
                {office.address}
              </p>
            )}

            {(office.phone || office.email) && (
              <div className="mt-2 flex flex-col gap-1 text-sm">
                {office.phone && (
                  <a
                    href={`tel:${office.phone.replace(/[^+\d]/g, "")}`}
                    dir="ltr"
                    className="text-gold hover:text-gold-bright w-fit transition-colors"
                  >
                    {office.phone}
                  </a>
                )}
                {office.email && (
                  <a
                    href={`mailto:${office.email}`}
                    dir="ltr"
                    className="text-gold hover:text-gold-bright w-fit transition-colors"
                  >
                    {office.email}
                  </a>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* One shared inbox, shown once beneath the branches it serves. */}
      <div className="border-bone/10 mt-6 border-t pt-4">
        <p className="text-bone/50 text-xs tracking-[0.2em] uppercase">
          {t("emailLabel")}
        </p>
        <a
          href={`mailto:${COMPANY_EMAIL}`}
          dir="ltr"
          className="text-gold hover:text-gold-bright mt-2 inline-block text-sm transition-colors"
        >
          {COMPANY_EMAIL}
        </a>
      </div>
    </>
  );
}
