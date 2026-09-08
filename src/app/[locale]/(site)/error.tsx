"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * The public site's error boundary.
 *
 * Placed inside the `(site)` group so a failed page still renders with the
 * header and footer around it — the visitor sees the site having a problem
 * rather than the site having vanished.
 *
 * Note the prop is `retry`, not the `reset` of earlier versions: `retry`
 * re-fetches and re-renders the segment, where `reset` only clears the error
 * state. For a server-side failure — which is nearly all of them here —
 * re-fetching is the only thing that can actually help.
 */
export default function SiteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    /*
     * The console is the whole reporting pipeline today. When a service is
     * wired up this is the one line that changes, and `digest` is the key that
     * ties what the visitor saw to the server log that explains it.
     */
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto flex min-h-[60svh] max-w-3xl flex-col justify-center px-6 py-24 sm:px-10">
      <h1 className="font-display text-bone text-4xl font-light sm:text-5xl">
        {t("title")}
      </h1>
      <p className="text-bone/58 mt-5 max-w-xl text-sm leading-relaxed">
        {t("body")}
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="bg-gold text-ink hover:bg-gold-bright flex min-h-11 cursor-pointer items-center rounded-full px-7 text-sm font-medium transition-colors"
        >
          {t("retry")}
        </button>
        <Link
          href="/"
          className="border-bone/20 text-bone/70 hover:border-gold hover:text-gold flex min-h-11 items-center rounded-full border px-7 text-sm transition-colors"
        >
          {t("home")}
        </Link>
      </div>

      {/*
       * Shown because it is the only thing a visitor can quote back that lets
       * the log be found. `dir="ltr"` — the hash is a Latin identifier and the
       * bidi algorithm reorders it in an RTL paragraph.
       */}
      {error.digest && (
        <p
          dir="ltr"
          className="text-bone/52 mt-8 text-start font-mono text-xs tracking-wider"
        >
          {t("reference", { digest: error.digest })}
        </p>
      )}
    </section>
  );
}
