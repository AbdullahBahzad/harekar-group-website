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
 * It is copied into the token at sign-in and refreshed on update, so gated
 * pages read entitlement without a query.
 *
 * The trade-off is staleness in both directions: a purchase does not appear,
 * and an expiry does not bite, until the token refreshes. Checkout calls
 * `update()` so a new purchase lands immediately; expiry is bounded by
 * `SESSION_MAX_AGE`.
 */

/**
 * How long a session lasts, and therefore the longest a stale `isPro` can
 * survive. Kept short enough that granting Pro is felt the same day without
 * forcing the user to sign in again constantly.
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
        return token;
      }

      /*
       * On an explicit `update()` call, re-read entitlement. This is what lets
       * a user who has just been granted Pro (or a guest seat) pick it up
       * without signing out, and it is the only place we pay for a query on an
       * existing session.
       */
      if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: String(token.id) },
          select: { isPro: true, proUntil: true, guestOf: true },
        });
        if (fresh) {
          token.isPro = hasProAccess(fresh);
          token.isGuest = fresh.guestOf !== null;
        }
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
 * A real bcrypt hash of a value nobody can sign in with.
 *
 * Only ever compared against to burn the same CPU time as a genuine check;
 * see the timing note in `authorize`.
 */
const DUMMY_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.9Zt0BLPBmYPQjBmvzcyFqBBZzUqLBqO";
