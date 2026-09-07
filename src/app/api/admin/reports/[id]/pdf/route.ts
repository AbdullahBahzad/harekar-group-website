import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderReportPdf } from "@/lib/pdf/render-report-pdf";
import type { ReportContent, ThreatLevel } from "@/lib/report-shape";

/**
 * Renders a saved Daily Security Report as the branded PDF, on demand.
 *
 * Same guard as `/api/admin/cv/[id]`: `isAdmin` is re-checked against the
 * database rather than trusted from the page that linked here, and a missing
 * row and an unauthorised caller both come back as 404 so report ids cannot
 * be enumerated from the response alone.
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
    select: { isAdmin: true },
  });
  if (!operator?.isAdmin) return notFound;

  const { id } = await params;
  const report = await prisma.dailyReport.findUnique({ where: { id } });
  if (!report) return notFound;

  const content = report.content as unknown as ReportContent;

  const pdf = await renderReportPdf({
    date: report.date,
    kurdistanThreat: report.kurdistanThreat as ThreatLevel,
    iraqThreat: report.iraqThreat as ThreatLevel,
    politicalKurdistan: report.politicalKurdistan,
    politicalIraq: report.politicalIraq,
    weather: report.weather,
    items: content.items,
  });

  const filename = `harekar-daily-security-report-${report.date
    .toISOString()
    .slice(0, 10)}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
