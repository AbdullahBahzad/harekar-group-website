"use server";

import { prisma } from "@/lib/prisma";

/** Keep in sync with MAX_CV_BYTES in ApplyForm.tsx and bodySizeLimit in next.config.ts. */
const MAX_CV_BYTES = 5 * 1024 * 1024;

/*
 * Browsers are inconsistent about the MIME type they attach to Office files —
 * some send the modern OOXML type, older ones the legacy `msword`, and a few
 * send nothing at all. The extension is checked alongside the type so a valid
 * CV is never rejected over a missing header.
 */
const ALLOWED_CV_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_CV_EXTENSIONS = [".pdf", ".doc", ".docx"];

export type ApplyFormState = {
  status: "idle" | "success" | "error";
  /** Translation key under the careers.apply namespace. */
  error?:
    | "errorRequired"
    | "errorEmail"
    | "errorCvRequired"
    | "errorCvType"
    | "errorCvSize"
    | "errorGeneric";
};

export async function submitApplication(
  _prevState: ApplyFormState,
  formData: FormData,
): Promise<ApplyFormState> {
  const field = (key: string) => String(formData.get(key) ?? "").trim();

  const name = field("name");
  const email = field("email");
  const phone = field("phone");
  const city = field("city");
  const address = field("address");
  const position = field("position");
  const coverLetter = field("coverLetter");

  if (!name || !email || !phone || !city || !address || !position || !coverLetter) {
    return { status: "error", error: "errorRequired" };
  }

  // Deliberately loose: the only useful check here is that the address could
  // plausibly be routed. Anything stricter rejects valid real-world addresses.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", error: "errorEmail" };
  }

  const cv = formData.get("cv");
  if (!(cv instanceof File) || cv.size === 0) {
    return { status: "error", error: "errorCvRequired" };
  }
  if (cv.size > MAX_CV_BYTES) {
    return { status: "error", error: "errorCvSize" };
  }

  const lowerName = cv.name.toLowerCase();
  const extensionOk = ALLOWED_CV_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (!extensionOk || (cv.type && !ALLOWED_CV_TYPES.has(cv.type))) {
    return { status: "error", error: "errorCvType" };
  }

  try {
    const cvData = Buffer.from(await cv.arrayBuffer());

    await prisma.jobApplication.create({
      data: {
        name,
        email,
        phone,
        city,
        address,
        position,
        coverLetter,
        // The filename is attacker-controlled and is only ever shown back to
        // staff, so strip any path segments before storing it.
        cvName: cv.name.replace(/^.*[\\/]/, "").slice(0, 255),
        cvType: cv.type || "application/octet-stream",
        cvSize: cv.size,
        cvData,
      },
    });
  } catch (error) {
    console.error("Failed to store job application", error);
    return { status: "error", error: "errorGeneric" };
  }

  return { status: "success" };
}
