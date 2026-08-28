import type { MailTransport } from "./types";

/**
 * Writes the message to the server log instead of sending it.
 *
 * Stands in until a provider is chosen, exactly as the stub payment provider
 * does — the whole path (something arrives, a notification is composed,
 * addressed and handed to a transport) is exercised today, so when the real
 * adapter lands the only untested code is the adapter.
 *
 * Unlike the payment stub, this one does **not** refuse to run in production,
 * and the difference is worth stating because the two look alike. A payment
 * stub that runs in production hands out the product for free, and that is
 * unrecoverable. A mail transport that only logs in production means an
 * operator is not pinged — but the enquiry itself is already safely in
 * Postgres and visible in the console, so nothing is lost that cannot be found.
 * Throwing here would turn "nobody got an email" into "the contact form is
 * broken", which is strictly worse for the person trying to reach the company.
 *
 * It complains loudly instead, once per process, so a deployment running
 * without a real transport is noisy rather than silent.
 */
let warned = false;

export const logTransport: MailTransport = {
  id: "log",

  async send(message) {
    if (process.env.NODE_ENV === "production" && !warned) {
      warned = true;
      console.warn(
        "[mail] MAIL_TRANSPORT is 'log' in production — notifications are " +
          "being written to the log and not delivered. Set it to a real " +
          "transport.",
      );
    }

    console.info(
      [
        "[mail] would send:",
        `  from:     ${message.from}`,
        `  to:       ${message.to}`,
        message.replyTo ? `  reply-to: ${message.replyTo}` : null,
        `  subject:  ${message.subject}`,
        "  ---",
        message.text.replace(/^/gm, "  "),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  },
};
