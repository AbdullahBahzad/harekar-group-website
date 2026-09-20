/**
 * The shape of a saved mailing-list entry, kept apart from `report-recipients.ts`
 * for the same reason `report-shape.ts` is kept apart from `reports.ts`: that
 * module imports Prisma, and a client component that imports a *value* from it
 * would drag the database client into the browser bundle. Types alone are
 * erased, values are not — so anything a client component needs at runtime
 * lives here.
 */
export type ReportRecipient = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  tag: string | null;
};

/** "Conno Ali", or whichever half exists, or null when neither does. */
export function recipientFullName(
  recipient: Pick<ReportRecipient, "firstName" | "lastName">,
): string | null {
  const full = [recipient.firstName, recipient.lastName]
    .filter(Boolean)
    .join(" ");
  return full || null;
}
