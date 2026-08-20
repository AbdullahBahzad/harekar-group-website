import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import GoogleOfficeMap from "@/components/GoogleOfficeMap";
import OfficeList from "@/components/OfficeList";
import Reveal from "@/components/Reveal";
import ContactForm from "./ContactForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return { title: t("title") };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <Contact />;
}

function Contact() {
  const t = useTranslations("contact");

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

      {/*
       * Form first in the source order so keyboard and screen-reader users
       * reach the thing they came to do before the orientation graphic, while
       * the wide layout still shows them side by side.
       */}
      <div className="mt-14 grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-20">
        <Reveal delay={0.12}>
          <ContactForm />
        </Reveal>

        <Reveal delay={0.18} className="lg:pt-2">
          <p className="text-bone/50 text-xs tracking-[0.28em] uppercase">
            {t("locationLabel")}
          </p>
          <div className="mt-6">
            <OfficeList />
          </div>
        </Reveal>
      </div>

      {/*
       * The map runs the full width rather than sharing the column with the
       * form. Squeezed into a side column it rendered barely 400px across,
       * where Google's own controls, attribution and labels crowd out the
       * streets — at that size it stops being a map and becomes a thumbnail.
       */}
      <Reveal delay={0.1} className="mt-20">
        <GoogleOfficeMap />
      </Reveal>
    </section>
  );
}
