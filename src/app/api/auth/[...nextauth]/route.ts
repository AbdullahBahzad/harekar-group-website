import { handlers } from "@/auth";

/**
 * Auth.js's own endpoints (callback, session, csrf, signout).
 *
 * Deliberately outside `[locale]`: these are machine endpoints the client
 * library calls at fixed paths, and a locale prefix would break the URLs
 * Auth.js constructs for itself.
 */
export const { GET, POST } = handlers;
