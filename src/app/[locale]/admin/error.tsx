"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

/**
 * The console's error boundary.
 *
 * Separate from the public one because the audience is: an operator who needs
 * the failure stated plainly and the reference to hand to whoever maintains
 * the deployment. No marketing voice, no "return home" — the rail is still
 * rendered around this, so every other station is one click away.
 */
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="border-status-critical/30 bg-status-critical/5 border p-6">
      <h1 className="text-status-critical text-sm tracking-wide uppercase">
        {t("title")}
      </h1>
      <p className="text-bone/65 mt-3 max-w-xl text-sm leading-relaxed">
        {t("body")}
      </p>

      <button
        type="button"
        onClick={() => retry()}
        className="border-bone/20 text-bone/70 hover:border-gold hover:text-gold mt-6 flex min-h-11 cursor-pointer items-center border px-4 text-xs transition-colors"
      >
        {t("retry")}
      </button>

      {error.digest && (
        <p
          dir="ltr"
          className="text-bone/52 mt-5 text-start font-mono text-xs tracking-wider"
        >
          {t("reference", { digest: error.digest })}
        </p>
      )}
    </div>
  );
}
