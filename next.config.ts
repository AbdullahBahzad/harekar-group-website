import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
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
