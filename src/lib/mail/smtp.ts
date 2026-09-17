import nodemailer from "nodemailer";
import type { MailTransport } from "./types";

/**
 * A real transport, for once — everything else in this folder is designed
 * around the assumption that mail might never actually be configured. This
 * one requires `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`; `getTransport` in
 * `index.ts` falls back to the log transport when they're missing, so a
 * deployment without them behaves exactly as it did before this file
 * existed rather than crashing.
 *
 * The client is built once and reused — `nodemailer.createTransport` opens
 * a connection pool, and building it per send would mean a fresh TLS
 * handshake (and a fresh chance to fail) on every report someone emails.
 */
let client: ReturnType<typeof nodemailer.createTransport> | null = null;

function getClient() {
  if (client) return client;

  client = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    // 465 is the implicit-TLS port; every other port (587, 25) negotiates
    // TLS itself via STARTTLS, which `secure: false` here still allows.
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return client;
}

export const smtpTransport: MailTransport = {
  id: "smtp",

  async send(message) {
    await getClient().sendMail({
      from: message.from,
      to: message.to,
      replyTo: message.replyTo,
      subject: message.subject,
      text: message.text,
      attachments: message.attachment
        ? [
            {
              filename: message.attachment.filename,
              content: message.attachment.content,
              contentType: message.attachment.contentType,
            },
          ]
        : undefined,
    });
  },
};
