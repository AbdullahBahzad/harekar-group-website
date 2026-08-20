import type { ReactNode } from "react";
import "./globals.css";

/*
 * The real <html>/<body> tags live in src/app/[locale]/layout.tsx, where the
 * active locale determines lang and dir. This root layout only exists to
 * satisfy Next's requirement that app/ has a top-level layout.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
