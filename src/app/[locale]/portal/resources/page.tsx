import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePortalUser } from "@/lib/portal/entitlement";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "portal.resources" });
  return { title: t("title") };
}

/**
 * Real destinations only — the public FAQ, the reports the portal already
 * files, and a direct line to the operations team. Conterra's own Resources
 * screen fills the same slot with the client's onboarding material and
 * documentation; this account has none of that to link to yet, and an
 * invented brochure would be worse than a short, honest list.
 */
export default async function PortalResourcesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePortalUser(locale);
  const t = await getTranslations({ locale, namespace: "portal.resources" });

  const links: { href: string; title: string; body: string; external?: boolean }[] = [
    {
      href: "/portal/reports",
      title: t("reportsTitle"),
      body: t("reportsBody"),
    },
    {
      href: "/faq",
      title: t("faqTitle"),
      body: t("faqBody"),
    },
    {
      href: "/contact",
      title: t("contactTitle"),
      body: t("contactBody"),
    },
  ];

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-bone text-3xl font-light">
          {t("title")}
        </h1>
        <p className="text-bone/55 mt-2 max-w-2xl text-sm leading-relaxed">
          {t("intro")}
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="border-bone/14 bg-surface/20 hover:border-gold/40 block h-full rounded-2xl border p-5 transition-colors"
            >
              <h2 className="text-bone text-base font-medium">{link.title}</h2>
              <p className="text-bone/60 mt-2 text-sm leading-relaxed">
                {link.body}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
