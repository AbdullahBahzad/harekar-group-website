import { logTransport } from "./log";
import type { MailMessage, MailTransport } from "./types";

export type { MailMessage, MailTransport } from "./types";

/**
 * The active transport, chosen by `MAIL_TRANSPORT`.
 *
 * Registering transports in a map rather than branching at each call site means
 * adding Resend or SMTP later is one import and one entry here — no call site
 * changes. Same shape as `lib/payments`, on purpose: two pluggable outbound
 * integrations that behave the same way are two fewer things to learn.
 */
const transports: Record<string, MailTransport> = {
  log: logTransport,
};

function getTransport(): MailTransport {
  const configured = process.env.MAIL_TRANSPORT ?? "log";
  return transports[configured] ?? logTransport;
}

/**
 * Sends a message, and never lets a mail failure become the caller's problem.
 *
 * This is the important property, not the sending. Every caller is a public
 * form that has *already committed its row* by the time this runs — the enquiry
 * is saved, the application is stored. If a mail server is unreachable or
 * mis-credentialed, the visitor must still be told their message was received,
 * because it was. Letting this throw would turn a delivery problem into a form
 * that appears broken, and would cost the very submission it was meant to
 * announce.
 *
 * So the result is a boolean nobody is obliged to check, the error is logged
 * server-side where it can be acted on, and the caller carries on.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  const from = process.env.MAIL_FROM?.trim();

  if (!from) {
    console.warn(
      "[mail] MAIL_FROM is not set — skipping notification. Set it to an " +
        "address the sending domain is authorised to send from.",
    );
    return false;
  }

  try {
    await getTransport().send({ ...message, from });
    return true;
  } catch (error) {
    console.error("[mail] Failed to send notification", error);
    return false;
  }
}

/**
 * Where internal alerts go, if anywhere.
 *
 * Returns null rather than defaulting to some address: guessing a recipient is
 * how mail ends up somewhere nobody reads, which is indistinguishable from not
 * sending it at all except that it looks like it worked.
 */
export function operationsInbox(): string | null {
  return process.env.MAIL_TO?.trim() || null;
}
