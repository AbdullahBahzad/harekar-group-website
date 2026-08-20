"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The header's account entry point: "Sign in" when signed out, "Account" when
 * signed in.
 *
 * While the session is still being fetched this renders nothing rather than a
 * guess. Showing "Sign in" optimistically and swapping it to "Account" a beat
 * later is a visible flicker on every page load, and it briefly tells a
 * signed-in user they are signed out.
 *
 * Styled as a quiet text link — it sits beside a solid gold CTA, and two
 * competing buttons would leave neither reading as the primary action.
 */
export default function AccountLink() {
  const t = useTranslations("nav");
  const { status } = useSession();

  if (status === "loading") {
    // Holds the space so the header does not reflow when the label arrives.
    return <span aria-hidden className="hidden w-20 lg:inline-block" />;
  }

  const signedIn = status === "authenticated";

  return (
    <Link
      href={signedIn ? "/account" : "/login"}
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "group text-bone/70 hover:text-gold relative hidden h-11 px-3 duration-300 lg:inline-flex",
      )}
    >
      {signedIn ? t("account") : t("signIn")}
      {/*
       * Underline that grows from the leading edge on hover. `scale-x` on a
       * transform keeps it compositor-only; animating `width` here would lay
       * out the whole header on every frame.
       *
       * `origin-inline-start` rather than `origin-left` so it grows from the
       * right in Arabic and Kurdish instead of running backwards.
       */}
      <span
        aria-hidden
        className="bg-gold absolute inset-x-2 bottom-1 h-px origin-inline-start scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100 motion-reduce:transition-none"
      />
    </Link>
  );
}
