import { operationsInbox, sendMail } from "./index";

/**
 * Internal alerts telling the team something arrived.
 *
 * Written in English regardless of the visitor's locale, and that is a
 * deliberate choice rather than an oversight: these go to one internal
 * operations inbox, not to the public. The submission itself is quoted verbatim
 * in whatever language it was written, which is the part that actually has to
 * survive — the surrounding labels only have to be readable by the handful of
 * people on that distribution list.
 *
 * Every function here is fire-and-check-nothing: the row is already committed
 * before they run, and `sendMail` swallows its own failures, so a mail outage
 * can never cost a submission or surface an error to the person who sent it.
 */

/** A quote request from the contact form. */
export async function notifyContactSubmission(submission: {
  name: string;
  email: string;
  organization: string | null;
  phone: string | null;
  message: string;
}): Promise<void> {
  const to = operationsInbox();
  if (!to) return;

  const who = submission.organization
    ? `${submission.name} (${submission.organization})`
    : submission.name;

  await sendMail({
    to,
    // The organisation is in the subject because triage happens in the list
    // view, before anything is opened.
    subject: `New quote request — ${who}`,
    replyTo: submission.email,
    text: [
      `Name:         ${submission.name}`,
      `Email:        ${submission.email}`,
      `Organisation: ${submission.organization ?? "—"}`,
      `Phone:        ${submission.phone ?? "—"}`,
      "",
      "Message:",
      submission.message,
      "",
      "Reply to this email to answer the sender directly.",
    ].join("\n"),
  });
}

/** A careers application. */
export async function notifyJobApplication(application: {
  name: string;
  email: string;
  phone: string;
  city: string;
  position: string;
}): Promise<void> {
  const to = operationsInbox();
  if (!to) return;

  await sendMail({
    to,
    subject: `New application — ${application.position} — ${application.name}`,
    replyTo: application.email,
    text: [
      `Name:     ${application.name}`,
      `Position: ${application.position}`,
      `Email:    ${application.email}`,
      `Phone:    ${application.phone}`,
      `City:     ${application.city}`,
      "",
      // Deliberately not attached: CVs are unsolicited personal data, and the
      // console serves them behind an admin check that an email attachment
      // would route straight around. See `api/admin/cv/[id]`.
      "The CV and cover letter are on the application in the console.",
    ].join("\n"),
  });
}
