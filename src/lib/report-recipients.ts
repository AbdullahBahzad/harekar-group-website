import { prisma } from "@/lib/prisma";
import { orPreview } from "@/lib/admin-preview";
import type { ReportRecipient } from "@/lib/recipient-shape";

export type { ReportRecipient };

/** A short sample list so the console still has something to look at when
 * previewing without a database — see `orPreview`. */
const sampleRecipients: ReportRecipient[] = [
  { id: "sample-1", email: "conno@techcorp.com", firstName: "Conno", lastName: "Ali", company: "TechCorp Inc.", tag: "Duhok" },
  { id: "sample-2", email: "sara@techcorp.com", firstName: "Sara", lastName: "Hassan", company: "TechCorp Inc.", tag: "Duhok" },
  { id: "sample-3", email: "omar@creative.example", firstName: "Omar", lastName: null, company: "Creative Solutions", tag: "Erbil" },
  { id: "sample-4", email: "info@innovate.example", firstName: null, lastName: null, company: "Innovate Global", tag: null },
];

/** The saved mailing list for the Daily Security Report, ordered so a newly
 * added address appears at the bottom rather than reshuffling the list. */
export async function getReportRecipients() {
  return orPreview<ReportRecipient[]>(
    () =>
      prisma.reportRecipient.findMany({
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          company: true,
          tag: true,
        },
      }),
    sampleRecipients,
  );
}
