"use server";

import { prisma } from "@/lib/prisma";

export type ContactFormState = {
  status: "idle" | "success" | "error";
  /** Translation key under the contact.form namespace. */
  error?: "errorRequired" | "errorGeneric";
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

  try {
    await prisma.contactSubmission.create({
      data: {
        name,
        email,
        organization: organization || null,
        phone: phone || null,
        message,
      },
    });
  } catch (error) {
    console.error("Failed to store contact submission", error);
    return { status: "error", error: "errorGeneric" };
  }

  return { status: "success" };
}
