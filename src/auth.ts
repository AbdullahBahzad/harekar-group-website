import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hasProAccess } from "@/lib/entitlement";

/**
 * Portal authentication.
 *
 * Sessions are JWTs rather than database rows. That is not a preference — the
 * Credentials provider cannot use database sessions, because Auth.js only
 * creates a session row through an adapter callback that credentials sign-in
 * deliberately does not run. The adapter is still wired up so that adding an
 * OAuth provider later needs no migration and no rewrite here.
 *
 * `isPro` on the session is the *resolved* entitlement from `hasProAccess` —
 * a permanent manual grant or unexpired purchased access — not the raw column.
 * It is copied into the token at sign-in, refreshed on `update()`, and
 * re-read at most every ENTITLEMENT_RECHECK_MS, so gated pages read
 * entitlement without a query on every request.
 *
 * Checkout calls `update()` so a new purchase lands immediately; an expiry or
 * revocation takes effect within ENTITLEMENT_RECHECK_MS. SESSION_MAX_AGE does
 * not bound it, because every session fetch re-signs the token.
 */

/**
 * The password was right, but the address has not been confirmed with its
 * emailed code yet. Raised only after a correct password, so it reveals
 * nothing to someone guessing — the sign-in action catches it by `code` and
 * sends the owner to the confirmation page with a fresh code.
 */
export class UnverifiedEmailError extends CredentialsSignin {
  code = "unverified";
}

/** How long a session lasts without being used. */
const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
  pages: {
    // Locale-prefixed because `localePrefix` is "always"; English is the
    // safe default when Auth.js redirects without locale context.
    signIn: "/en/login",
    error: "/en/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          // `guestOf` is a relation, so it is not selected by default — this
          // is the one place `isGuest` is decided, from whether the accepted
          // invite row still points here (see `PortalGuest`).
          include: { guestOf: true },
        });

        /*
         * A missing user and a wrong password must cost the same amount of
         * time, or the difference reveals which emails are registered. Hashing
         * against a dummy value keeps the two paths comparable instead of
         * returning instantly when no row is found.
         */
        if (!user?.passwordHash) {
          await bcrypt.compare(password, DUMMY_HASH);
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // New accounts confirm their email by code before first sign-in.
        // Administrators are exempt: they are only ever created on the
        // server, by someone who already holds the database.
        if (!user.emailVerified && !user.isAdmin) throw new UnverifiedEmailError();

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isPro: hasProAccess(user),
          isGuest: user.guestOf !== null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Sign-in: seed the token from the row we just authenticated.
      if (user) {
        token.id = user.id;
        token.isPro = user.isPro;
        token.isGuest = user.isGuest;
        token.checkedAt = Date.now();
        return token;
      }

      /*
       * Re-read entitlement on an explicit `update()` call (so a purchase or a
       * new guest seat shows at once), and otherwise whenever the last check is
       * older than ENTITLEMENT_RECHECK_MS.
       *
       * The periodic re-read is what makes expiry and revocation actually bite.
       * Every session fetch re-signs the token with a fresh expiry, so an
       * account that visits daily would otherwise keep the `isPro` it signed in
       * with indefinitely: past `proUntil`, after a guest seat is revoked, after
       * a comp is withdrawn. At most one small query per user per window.
       */
      const stale =
        typeof token.checkedAt !== "number" ||
        Date.now() - token.checkedAt > ENTITLEMENT_RECHECK_MS;
      if (token.id && (trigger === "update" || stale)) {
        const fresh = await prisma.user.findUnique({
          where: { id: String(token.id) },
          select: { isPro: true, proUntil: true, guestOf: true },
        });
        // A deleted account keeps its cookie until it expires, but nothing it
        // was entitled to.
        token.isPro = fresh ? hasProAccess(fresh) : false;
        token.isGuest = fresh ? fresh.guestOf !== null : false;
        token.checkedAt = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.isPro = Boolean(token.isPro);
        session.user.isGuest = Boolean(token.isGuest);
      }
      return session;
    },
  },
});

/**
 * How long a session may go on trusting its own copy of `isPro`/`isGuest`
 * before the jwt callback re-reads them from the database. This, not
 * SESSION_MAX_AGE, is the bound on how long lapsed access can linger.
 */
const ENTITLEMENT_RECHECK_MS = 5 * 60 * 1000;

/**
 * A real bcrypt hash of a value nobody can sign in with.
 *
 * Only ever compared against to burn the same CPU time as a genuine check;
 * see the timing note in `authorize`.
 */
const DUMMY_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.9Zt0BLPBmYPQjBmvzcyFqBBZzUqLBqO";
