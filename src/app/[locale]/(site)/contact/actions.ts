"use server";

import { prisma } from "@/lib/prisma";
import { clientKey, withinRateLimit } from "@/lib/rate-limit";
import { notifyContactSubmission } from "@/lib/mail/notifications";

/*
 * Deliberately permissive, and identical to the check the careers form already
 * applies: a local part, an @, and a dot in the domain. Stricter patterns
 * reject valid addresses, and nothing here proves ownership anyway — the point
 * is to catch the typo that makes a reply impossible, not to be a validator.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Caps on what a single submission may carry.
 *
 * Without them the message column takes whatever is posted, and an anonymous
 * endpoint that writes unbounded text to Postgres is a disk-filling script
 * waiting to be written. The limits are far above any genuine enquiry — the
 * longest sample message in the console is a few hundred characters.
 */
const LIMITS = {
  name: 200,
  email: 320, // the maximum length of an email address per RFC 5321
  organization: 200,
  phone: 60,
  message: 5_000,
} as const;

/** Six enquiries an hour from one address is generous for a human. */
const RATE_LIMIT = 6;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export type ContactFormState = {
  status: "idle" | "success" | "error";
  /** Translation key under the contact.form namespace. */
  error?:
    | "errorRequired"
    | "errorEmail"
    | "errorTooLong"
    | "errorTooMany"
    | "errorGeneric";
};

export async function submitContactForm(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const organization = String(formData.get("organization") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email || !message) {
    return { status: "error", error: "errorRequired" };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { status: "error", error: "errorEmail" };
  }
  if (
    name.length > LIMITS.name ||
    email.length > LIMITS.email ||
    organization.length > LIMITS.organization ||
    phone.length > LIMITS.phone ||
    message.length > LIMITS.message
  ) {
    return { status: "error", error: "errorTooLong" };
  }

  /*
   * Checked after validation so a malformed submission cannot burn a genuine
   * sender's allowance, and before the write so the limit actually protects
   * the database rather than merely reporting on it.
   */
  if (!withinRateLimit(await clientKey("contact"), RATE_LIMIT, RATE_WINDOW_MS)) {
    return { status: "error", error: "errorTooMany" };
  }

  const submission = {
    name,
    email,
    organization: organization || null,
    phone: phone || null,
    message,
  };

  try {
    await prisma.contactSubmission.create({ data: submission });
  } catch (error) {
    console.error("Failed to store contact submission", error);
    return { status: "error", error: "errorGeneric" };
  }

  /*
   * After the write, and outside its try/catch on purpose. The enquiry is
   * safely stored by this point, so a mail outage must not reach the sender —
   * `notifyContactSubmission` swallows its own failures for that reason.
   */
  await notifyContactSubmission(submission);

  return { status: "success" };
}
