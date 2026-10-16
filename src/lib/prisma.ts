import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  warnedUnreachable: boolean | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Reports a read that failed and fell back to the site's built-in content.
 *
 * "The database cannot be reached at all" (wrong credentials, server down, no
 * DATABASE_URL) is one condition, not one per query: every component that
 * reads would otherwise log its own error on every request — a dozen stack
 * traces a page, all saying the same thing, and in development each one lands
 * in the error overlay although the page rendered fine. That case is logged
 * once per server process, as a warning that says what to fix.
 *
 * Anything else — a failed query against a database that *is* reachable — is
 * a real fault and is still logged as an error, every time, with the cause.
 */
export function logReadFallback(what: string, error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    if (globalForPrisma.warnedUnreachable) return;
    globalForPrisma.warnedUnreachable = true;
    console.warn(
      `Database unreachable — serving the built-in site content instead. ` +
        `Check DATABASE_URL in .env. (${error.message.trim().split("\n").pop()})`,
    );
    return;
  }
  console.error(`Falling back to ${what}`, error);
}
