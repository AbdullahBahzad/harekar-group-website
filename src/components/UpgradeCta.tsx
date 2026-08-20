"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The header's Pro call to action.
 *
 * Where it points depends on where the visitor is in the funnel: a stranger is
 * sent to register, a signed-in Standard account to the pricing page. A Pro
 * account is shown nothing at all — continuing to advertise an upgrade to
 * someone who has already bought it is the fastest way to make a paid tier
 * feel worthless.
 *
 * It is the one solid-gold element in the bar. Everything around it is glass
 * and hairlines specifically so this reads as the primary action without
 * needing to be large.
 */
export default function UpgradeCta() {
  const t = useTranslations("cta");
  const { data: session, status } = useSession();

  // Render nothing until known, rather than flashing the wrong destination.
  if (status === "loading") return null;
  if (session?.user?.isPro) return null;

  return (
    <Link
      href={session?.user ? "/pro" : "/register"}
      className={cn(
        buttonVariants({ size: "sm" }),
        "group hover:shadow-gold/25 relative hidden h-11 overflow-hidden px-4 transition-shadow duration-300 hover:shadow-[0_0_28px_-4px] lg:inline-flex",
      )}
    >
      {/*
       * Specular sweep, mirroring the hero lion's. It runs on hover only —
       * a permanently animating element in a sticky bar is a permanent
       * distraction, and on a security site that reads as a banner ad.
       *
       * `motion-reduce` removes it outright rather than shortening it.
       */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full motion-reduce:hidden motion-reduce:transition-none"
      />
      <span className="relative">{t("upgradePro")}</span>
    </Link>
  );
}
