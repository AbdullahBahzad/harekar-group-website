import type { ReactNode } from "react";

/**
 * The centred card both auth pages sit in.
 *
 * `min-h-svh` rather than `min-h-screen`: on mobile browsers `vh` is measured
 * against the viewport with the URL bar hidden, so a full-height auth card
 * ends up taller than the space actually available and the submit button
 * lands under the chrome.
 */
export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-h-svh items-center justify-center px-6 py-24">
      <div className="w-full max-w-md">
        <h1 className="font-display text-bone text-3xl leading-tight font-light text-balance sm:text-4xl">
          {title}
        </h1>
        <p className="text-bone/65 mt-4 text-sm leading-relaxed text-pretty">
          {subtitle}
        </p>

        <div className="border-bone/14 bg-surface/20 mt-10 rounded-3xl border p-6 sm:p-8">
          {children}
        </div>
      </div>
    </section>
  );
}
