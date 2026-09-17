import { prisma } from "@/lib/prisma";
import { orPreview } from "@/lib/admin-preview";

export type ReportRecipient = {
  id: string;
  email: string;
  name: string | null;
};

/** A short sample list so the console still has something to look at when
 * previewing without a database — see `orPreview`. */
const sampleRecipients: ReportRecipient[] = [
  { id: "sample-1", email: "client@example.com", name: "Sample Client" },
];

/** The saved mailing list for the Daily Security Report, ordered so a newly
 * added address appears at the bottom rather than reshuffling the list. */
export async function getReportRecipients() {
  return orPreview<ReportRecipient[]>(
    () =>
      prisma.reportRecipient.findMany({
        orderBy: { createdAt: "asc" },
        select: { id: true, email: true, name: true },
      }),
    sampleRecipients,
  );
}
