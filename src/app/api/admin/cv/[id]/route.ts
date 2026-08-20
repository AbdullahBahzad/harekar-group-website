import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Serves a stored CV to an administrator.
 *
 * CVs are unsolicited personal data, so this endpoint re-checks `isAdmin`
 * against the database on every request. It deliberately does not accept a
 * signed URL or any other bearer token: a link that grants access on its own
 * is a link that can be forwarded out of the company.
 *
 * A missing row and an unauthorised caller both return 404. Distinguishing
 * them would let anyone enumerate which application ids exist.
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
  const application = await prisma.jobApplication.findUnique({
    where: { id },
    select: { cvData: true, cvName: true, cvType: true },
  });
  if (!application) return notFound;

  /*
   * `attachment` rather than `inline`: a CV is an arbitrary uploaded file, and
   * rendering one in the browser origin is how a malicious upload becomes a
   * script running on this domain. The quoted filename and nosniff header
   * close the same door from the other side.
   */
  return new NextResponse(new Uint8Array(application.cvData), {
    headers: {
      "Content-Type": application.cvType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${application.cvName.replace(/"/g, "")}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
