import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { renderSavedReportPdf } from "@/lib/pdf/saved-report";

/**
 * Renders a saved Daily Security Report as the branded PDF, for the client
 * portal's own download button.
 *
 * Same shape as `/api/admin/reports/[id]/pdf`, checking `isPro` instead of
 * `isAdmin` — re-checked here rather than trusted from the page that linked
 * here, and a missing row or an unauthorised caller both come back as 404 so
 * report ids cannot be enumerated from the response alone.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const notFound = new NextResponse("Not found", { status: 404 });

  if (!session?.user?.isPro) return notFound;

  const { id } = await params;

  let rendered: Awaited<ReturnType<typeof renderSavedReportPdf>>;
  try {
    rendered = await renderSavedReportPdf(id);
  } catch (error) {
    console.error("Failed to render portal report PDF", error);
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
