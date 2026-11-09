import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderSavedReportPdf } from "@/lib/pdf/saved-report";

/**
 * Renders a saved Daily Security Report as the branded PDF, on demand.
 *
 * Open to the same operators as the Sources station that links here:
 * administrators and reports-only operators (`canManageReports`). Both flags
 * are re-checked against the database rather than trusted from the page that
 * linked here, and a missing row and an unauthorised caller both come back as
 * 404 so report ids cannot be enumerated from the response alone.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const notFound = new NextResponse("Not found", { status: 404 });

  if (!session?.user?.id) return notFound;

  const operator = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, canManageReports: true },
  });
  if (!operator?.isAdmin && !operator?.canManageReports) return notFound;

  const { id } = await params;

  let rendered: Awaited<ReturnType<typeof renderSavedReportPdf>>;
  try {
    rendered = await renderSavedReportPdf(id);
  } catch (error) {
    console.error("Failed to render report PDF", error);
    return new NextResponse("Could not render this report", { status: 500 });
  }
  if (!rendered) return notFound;

  const filename = `harekar-daily-security-report-${rendered.dateLabel}.pdf`;

  return new NextResponse(new Uint8Array(rendered.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
