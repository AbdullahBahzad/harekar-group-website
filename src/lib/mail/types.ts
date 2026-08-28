/**
 * The vocabulary of an outgoing message, shared by every transport.
 *
 * Deliberately the smallest shape that does the job: a recipient, a subject and
 * a plain-text body. No HTML, no templates, no attachments — the only mail this
 * application sends is an internal alert to the operations inbox saying
 * something arrived, and the thing that arrived is read in the console. A
 * template engine would be structure without a second caller to justify it.
 */
export type MailMessage = {
  /** Recipient address. */
  to: string;
  subject: string;
  /** Plain text. Kept plain so no transport has to sanitise markup. */
  text: string;
  /**
   * Where a human reply should go — the enquirer, not the site.
   *
   * The `from` address has to be one the sending domain is authorised to use or
   * the message is spam-filtered, so it cannot be the customer's address. This
   * is how someone hits Reply and reaches them anyway.
   */
  replyTo?: string;
};

export type MailTransport = {
  id: string;
  send(message: MailMessage & { from: string }): Promise<void>;
};
