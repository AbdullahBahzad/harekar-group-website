"use server";

import { prisma } from "@/lib/prisma";
import { clientKey, withinRateLimit } from "@/lib/rate-limit";
import { notifyJobApplication } from "@/lib/mail/notifications";

/** Keep in sync with MAX_CV_BYTES in ApplyForm.tsx and bodySizeLimit in next.config.ts. */
const MAX_CV_BYTES = 5 * 1024 * 1024;

/**
 * Caps on the text fields, matching the contact form's reasoning.
 *
 * The CV was already bounded, but the prose beside it was not — and this action
 * accepts a 6MB body, so everything the file does not use is headroom an
 * unbounded `coverLetter` will happily take. The limits sit far above any real
 * application; the longest genuine cover letter is a page.
 */
const LIMITS = {
  name: 200,
  email: 320, // the maximum length of an email address per RFC 5321
  phone: 60,
  city: 120,
  address: 300,
  position: 200,
  coverLetter: 5_000,
} as const;

/**
 * Three applications an hour from one address is generous for a human.
 *
 * Tighter than the contact form's six because this is the more expensive
 * endpoint by a wide margin: it is the only unauthenticated path that writes
 * megabytes to Postgres, so it is the cheapest one to abuse.
 */
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60 * 60 * 1000;

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
    | "errorTooLong"
    | "errorTooMany"
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

  if (
    name.length > LIMITS.name ||
    email.length > LIMITS.email ||
    phone.length > LIMITS.phone ||
    city.length > LIMITS.city ||
    address.length > LIMITS.address ||
    position.length > LIMITS.position ||
    coverLetter.length > LIMITS.coverLetter
  ) {
    return { status: "error", error: "errorTooLong" };
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

  /*
   * Checked after validation so a malformed submission cannot burn a genuine
   * applicant's allowance, and before `arrayBuffer()` below so a caller over
   * its budget is turned away before five megabytes are pulled into memory.
   */
  if (!withinRateLimit(await clientKey("careers"), RATE_LIMIT, RATE_WINDOW_MS)) {
    return { status: "error", error: "errorTooMany" };
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

  // After the write, and deliberately not inside its try/catch — see the same
  // note on the contact form. The application is stored; the alert is a bonus.
  await notifyJobApplication({ name, email, phone, city, position });

  return { status: "success" };
}
