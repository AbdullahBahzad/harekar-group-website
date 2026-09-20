"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { renderSavedReportPdf } from "@/lib/pdf/saved-report";
import {
  reportEmailBody,
  reportEmailFilename,
  reportEmailSubject,
} from "@/lib/report-email";

/**
 * Same rule as the Sources station, whose report this station mails: a
 * reports-only operator (`canManageReports`) may use it as well as a full
 * admin. Re-checked here because a server action is a public endpoint — the
 * page's own gate does not protect it.
 */
async function assertReportsAccess(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, canManageReports: true },
  });
  if (!user?.isAdmin && !user?.canManageReports) {
    throw new Error("Not authorised");
  }

  return session.user.id;
}

function revalidateEmailing() {
  revalidatePath("/[locale]/admin/emailing", "page");
}

/** A simple, deliberately permissive check — real validation is the mail
 * server rejecting the send; this just catches typos before they are saved. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Generous for real names and companies, small enough that a paste of the
 * wrong thing cannot fill the list. */
const MAX_FIELD = 120;

/**
 * How many messages go out at once. A whole mailing list fired in parallel
 * opens one SMTP connection per address, which providers read as abuse and
 * start refusing; a small window keeps the throughput without the burst.
 */
const SEND_BATCH = 10;

/** Ceiling on one send, so a crafted request cannot ask for every row at once. */
const MAX_RECIPIENTS_PER_SEND = 500;

export type AddRecipientState = {
  status: "idle" | "error" | "success";
  /** A key under `admin.emailing`, not a sentence — see `OperatorFormState`
   * in `accounts/actions.ts` for why the console does it this way. */
  messageKey?: string;
};

/**
 * Saves a client to the mailing list. Upsert on email — re-adding an address
 * already on the list updates its details instead of erroring, so the form
 * never has to ask "do you mean edit or add?".
 */
export async function addRecipient(
  formData: FormData,
): Promise<AddRecipientState> {
  try {
    await assertReportsAccess();
  } catch {
    return { status: "error", messageKey: "notAuthorised" };
  }

  const read = (field: string) =>
    String(formData.get(field) ?? "")
      .trim()
      .slice(0, MAX_FIELD);

  const email = read("email").toLowerCase();
  const firstName = read("firstName");
  const lastName = read("lastName");
  const company = read("company");
  const tag = read("tag");

  if (!EMAIL_PATTERN.test(email)) {
    return { status: "error", messageKey: "emailInvalid" };
  }
  // The one required field beyond the address: the Companies audience is
  // meaningless if half the list belongs to no one.
  if (!company) {
    return { status: "error", messageKey: "companyRequired" };
  }

  const data = {
    firstName: firstName || null,
    lastName: lastName || null,
    company,
    tag: tag || null,
  };

  await prisma.reportRecipient.upsert({
    where: { email },
    update: data,
    create: { email, ...data },
  });

  revalidateEmailing();
  return { status: "success", messageKey: "added" };
}

export async function removeRecipient(formData: FormData) {
  await assertReportsAccess();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing recipient id");

  await prisma.reportRecipient.delete({ where: { id } });
  revalidateEmailing();
}

export type SendToSelectedState = {
  status: "idle" | "error" | "success";
  messageKey?: string;
  /** Interpolation values for `messageKey` — e.g. `{ sent: "8", total: "10" }`
   * for a partial-failure summary. */
  values?: Record<string, string>;
};

/**
 * The "one click" send: mails one saved report, as its branded PDF, to exactly
 * the recipients ticked in the console.
 *
 * Renders the PDF once and reuses the buffer for every address — the render is
 * the expensive, deterministic part (same report, same bytes every time), so
 * redoing it per address would be pure waste, unlike the message itself, whose
 * greeting genuinely differs per person.
 */
export async function sendReportToSelected(
  formData: FormData,
): Promise<SendToSelectedState> {
  try {
    await assertReportsAccess();
  } catch {
    return { status: "error", messageKey: "notAuthorised" };
  }

  const reportId = String(formData.get("reportId") ?? "");
  if (!reportId) return { status: "error", messageKey: "noTemplate" };

  const note = String(formData.get("note") ?? "")
    .trim()
    .slice(0, 2000);

  const ids = [
    ...new Set(
      formData
        .getAll("id")
        .map(String)
        .filter(Boolean),
    ),
  ];
  if (ids.length === 0) return { status: "error", messageKey: "noneSelected" };
  if (ids.length > MAX_RECIPIENTS_PER_SEND) {
    return {
      status: "error",
      messageKey: "tooMany",
      values: { max: String(MAX_RECIPIENTS_PER_SEND) },
    };
  }

  // Resolved server-side from the ids, never from addresses in the request:
  // the client says *who*, the database says where to send.
  const recipients = await prisma.reportRecipient.findMany({
    where: { id: { in: ids } },
    select: { email: true, firstName: true },
  });
  if (recipients.length === 0) {
    return { status: "error", messageKey: "noneSelected" };
  }

  let rendered: Awaited<ReturnType<typeof renderSavedReportPdf>>;
  try {
    rendered = await renderSavedReportPdf(reportId);
  } catch (error) {
    console.error("Failed to render report PDF for bulk email", error);
    return { status: "error", messageKey: "sendFailed" };
  }
  if (!rendered) return { status: "error", messageKey: "templateGone" };

  const { dateLabel, pdf } = rendered;

  let sentCount = 0;
  for (let i = 0; i < recipients.length; i += SEND_BATCH) {
    const outcomes = await Promise.all(
      recipients.slice(i, i + SEND_BATCH).map((recipient) =>
        sendMail({
          to: recipient.email,
          subject: reportEmailSubject(dateLabel),
          text: reportEmailBody(recipient.firstName, note),
          attachment: {
            filename: reportEmailFilename(dateLabel),
            content: pdf,
            contentType: "application/pdf",
          },
        }),
      ),
    );
    sentCount += outcomes.filter(Boolean).length;
  }

  if (sentCount === 0) return { status: "error", messageKey: "sendFailed" };
  if (sentCount < recipients.length) {
    return {
      status: "success",
      messageKey: "sentPartial",
      values: { sent: String(sentCount), total: String(recipients.length) },
    };
  }
  return {
    status: "success",
    messageKey: "sent",
    values: { count: String(sentCount) },
  };
}
