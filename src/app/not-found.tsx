import Link from "next/link";
import { routing } from "@/i18n/routing";

/**
 * The 404 for URLs that never reach a locale segment.
 *
 * `/nonsense` matches no route, so `[locale]/layout.tsx` — which owns the real
 * `<html>`/`<body>` and the font variables — never runs, and neither does the
 * translation provider. That leaves two consequences this file has to accept:
 * it must render its own document, and it has no reader language to render in.
 *
 * So it is deliberately minimal and English-only, and its one job is to hand
 * the visitor back to a localised route. Anything reached through the site is
 * caught by `[locale]/(site)/not-found.tsx` instead, which is translated and
 * keeps the header and footer.
 */
export default function RootNotFound() {
  return (
    <html lang={routing.defaultLocale} dir="ltr" className="h-full">
      <body className="bg-ink text-bone flex min-h-full items-center justify-center px-6 antialiased">
        <main className="max-w-md text-center">
          <p className="text-gold/60 font-mono text-xs tracking-[0.4em]">404</p>
          <h1 className="font-display mt-5 text-4xl font-light">
            Page not found
          </h1>
          <p className="text-bone/58 mt-4 text-sm leading-relaxed">
            The page you are looking for has moved or no longer exists.
          </p>
          <Link
            href={`/${routing.defaultLocale}`}
            className="bg-gold text-ink hover:bg-gold-bright mx-auto mt-9 flex min-h-11 w-fit items-center rounded-full px-7 text-sm font-medium transition-colors"
          >
            Return home
          </Link>
        </main>
      </body>
    </html>
  );
}
