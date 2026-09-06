/**
 * Sender addresses. Self-hosted SMTP relays usually only accept the address
 * of the mailbox you authenticate with, so `MAIL_FROM` should be that mailbox
 * (optionally with a display name: `FasterFixes <bugs@example.com>`).
 *
 * Defaults keep the hosted-cloud behaviour: contact@ / noreply@ DOMAIN_NAME.
 */
export const SENDER_EMAIL =
  process.env.MAIL_FROM || `contact@${process.env.DOMAIN_NAME}`;

export const NO_REPLY_EMAIL =
  process.env.MAIL_NOREPLY_FROM || process.env.MAIL_FROM || `noreply@${process.env.DOMAIN_NAME}`;
