import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy.
 *
 * One honest caveat up front: `script-src` carries `'unsafe-inline'`. The App
 * Router injects its own bootstrap and flight-data scripts inline, and the only
 * way to allow those specifically is a per-request nonce — which needs
 * middleware, and makes every page dynamic, losing static generation across the
 * whole marketing site. That is a bigger decision than a header, so it is not
 * taken here.
 *
 * What this policy still buys, all of which the site had none of before:
 * `frame-ancestors` (the console could be framed and clickjacked),
 * `object-src`/`base-uri`/`form-action` (plugin and base-tag injection, and
 * posting a form off-site), and a closed list of where images, fonts and frames
 * may come from at all.
 *
 * The external origins are the two the app genuinely uses: Google Maps, framed
 * on the contact page, and Sanity's image CDN. `next/font` downloads and
 * self-hosts at build time, so Google Fonts is deliberately absent.
 */
const csp = [
  "default-src 'self'",
  // 'unsafe-eval' is dev-only: React Fast Refresh needs it, production does not.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.sanity.io",
  "font-src 'self' data:",
  // The dev server's HMR socket; nothing else needs an outbound connection.
  `connect-src 'self' https://cdn.sanity.io https://*.api.sanity.io${isDev ? " ws: wss:" : ""}`,
  "frame-src https://www.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "worker-src 'self' blob:",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Redundant with frame-ancestors for modern browsers; kept for older ones.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send the origin cross-site, never the path — order ids ride in query
  // strings on the payment result page.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Only meaningful over TLS, and actively unhelpful pinned against localhost.
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  /*
   * Client and service photos are served through their own API routes
   * (`/api/clients/[id]/image`, `/api/services/[id]/image`) with a `?v=`
   * cache-busting query string appended — see `lib/clients.ts` and
   * `lib/services.ts`. `next/image` refuses to optimize a local image URL
   * that carries a query string unless the pattern is explicitly allow-listed
   * here; omitting `search` allows any value rather than pinning it to the
   * timestamp of whichever row happened to exist at build time.
   */
  images: {
    localPatterns: [
      { pathname: "/api/clients/**" },
      { pathname: "/api/services/**" },
    ],
  },

  allowedDevOrigins: ["192.168.100.66"],
  experimental: {
    serverActions: {
      /*
       * Careers applications post a CV through a Server Action, and the default
       * action body cap is 1MB. The form rejects anything over 5MB client- and
       * server-side; the extra megabyte is headroom for the multipart boundary,
       * part headers and the accompanying text fields.
       */
      bodySizeLimit: "6mb",
    },
  },
};

export default withNextIntl(nextConfig);
