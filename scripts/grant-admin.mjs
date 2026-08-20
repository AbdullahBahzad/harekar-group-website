/**
 * Promotes an existing account to console access.
 *
 * There is deliberately no way to become an administrator from inside the
 * application — no "first user wins" rule, no invite code, no sign-up
 * checkbox. Each of those is a door onto the console that ships enabled. The
 * only path is this script, run by whoever already has the database.
 *
 * Usage: node scripts/grant-admin.mjs someone@harekargroup.com
 *        node scripts/grant-admin.mjs someone@harekargroup.com --revoke
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [rawEmail, ...flags] = process.argv.slice(2);
  const revoke = flags.includes("--revoke");

  if (!rawEmail) {
    console.error("Usage: node scripts/grant-admin.mjs <email> [--revoke]");
    process.exit(1);
  }

  // Registration lowercases addresses, so the lookup must too.
  const email = rawEmail.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, isAdmin: true },
  });

  if (!user) {
    console.error(
      `No account found for ${email}. Register through the site first, then run this again.`,
    );
    process.exit(1);
  }

  if (user.isAdmin === !revoke) {
    console.log(
      `${email} already has console access ${revoke ? "revoked" : "granted"}. Nothing to do.`,
    );
    return;
  }

  await prisma.user.update({
    where: { email },
    data: { isAdmin: !revoke },
  });

  console.log(
    `${revoke ? "Revoked" : "Granted"} console access for ${user.name ?? email}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
