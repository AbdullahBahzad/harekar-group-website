import type { DefaultSession } from "next-auth";

/**
 * Adds the portal's own fields to Auth.js's types.
 *
 * Without this, `session.user.isPro` is a type error everywhere it is read,
 * and the entitlement check would have to be cast at each call site — which is
 * exactly the kind of thing that silently becomes `undefined` and fails open.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      /** Paid tier. Set manually in the database. */
      isPro: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    isPro: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isPro?: boolean;
  }
}
