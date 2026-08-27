import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Reveal from "@/components/Reveal";
import { getPublishedClients } from "@/lib/clients";
import ClientWall from "./ClientWall";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "clients" });
  return { title: t("eyebrow"), description: t("subtitle") };
}

export default async function ClientsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const logos = await getPublishedClients();
  return <Clients logos={logos} />;
}

function Clients({
  logos,
}: {
  logos: Awaited<ReturnType<typeof getPublishedClients>>;
}) {
  const t = useTranslations("clients");

  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <Reveal className="max-w-2xl">
        <p className="text-gold/80 text-xs tracking-[0.35em] uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="font-display text-bone mt-6 text-4xl leading-[1.15] font-light text-balance sm:text-5xl">
          {t("title")}
        </h1>
        <p className="text-bone/60 mt-6 text-base leading-relaxed text-pretty">
          {t("subtitle")}
        </p>
      </Reveal>

      <Reveal delay={0.1} className="mt-14">
        <ClientWall logos={logos} />
      </Reveal>
    </section>
  );
}
