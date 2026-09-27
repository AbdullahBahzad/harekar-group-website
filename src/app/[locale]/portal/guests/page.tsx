import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePortalUser } from "@/lib/portal/entitlement";
import { getGuests } from "@/lib/portal/guests";
import GuestsConsole from "@/components/portal/GuestsConsole";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "portal.guests" });
  return { title: t("title") };
}

export default async function PortalGuestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePortalUser(locale);

  // A guest seat cannot invite further guests — sent to the station it does
  // have, rather than shown an empty one it has no use for.
  if (user.isGuest) redirect(`/${locale}/portal/reports`);

  const guests = await getGuests(user.id);

  return <GuestsConsole guests={guests} />;
}
