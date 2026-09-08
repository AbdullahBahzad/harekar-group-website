"use client";

import "./globals.css";

/**
 * The last resort: the boundary for failures in the root layout itself.
 *
 * It replaces the root layout when active, which means nothing above it is
 * available — no fonts, no translations, not even the stylesheet unless it is
 * imported here, which is why it is. English-only for the same reason as
 * `not-found.tsx`: if the locale layout is what failed, there is no reliable
 * reader language left to render in.
 *
 * If a visitor ever sees this, something is broken badly enough that the
 * digest is the most useful thing on the page.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en" dir="ltr" className="h-full">
      <body className="bg-ink text-bone flex min-h-full items-center justify-center px-6 antialiased">
        <main className="max-w-md text-center">
          <h1 className="font-display text-4xl font-light">
            Something went wrong
          </h1>
          <p className="text-bone/58 mt-4 text-sm leading-relaxed">
            The site could not be loaded. Try again in a moment.
          </p>

          <button
            type="button"
            onClick={() => retry()}
            className="bg-gold text-ink hover:bg-gold-bright mx-auto mt-9 flex min-h-11 w-fit cursor-pointer items-center rounded-full px-7 text-sm font-medium transition-colors"
          >
            Try again
          </button>

          {error.digest && (
            <p className="text-bone/52 mt-8 font-mono text-xs tracking-wider">
              Reference {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
