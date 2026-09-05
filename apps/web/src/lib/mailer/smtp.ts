import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

import {
  Contact,
  CreateContactOptions,
  EmailError,
  EmailResponse,
  Mailer,
  MailOptions,
  UpdateContactOptions,
} from "./types";

export type SmtpConfig = {
  host: string;
  port: number;
  /** Implicit TLS (port 465). STARTTLS on 587 is negotiated automatically. */
  secure: boolean;
  user?: string;
  pass?: string;
  /** Set to false for self-signed certificates on internal relays. */
  rejectUnauthorized: boolean;
};

export function smtpConfigFromEnv(): SmtpConfig {
  const host = process.env.SMTP_HOST;
  if (!host) {
    throw new EmailError("SMTP_HOST is required for MAIL_PROVIDER=smtp", "CONFIG");
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  return {
    host,
    port,
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === "true"
      : port === 465,
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
    rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false",
  };
}

/**
 * Plain SMTP mailer for self-hosted installs. Works with any relay: Postfix,
 * Mailcow, Mailpit (dev), Mailgun/Postmark/SES SMTP endpoints, ...
 *
 * Marketing contact management is a hosted-cloud concern (Resend/Plunk
 * segments); the SMTP mailer implements those methods as no-ops so callers
 * never have to branch on the provider.
 */
export class SmtpMailer implements Mailer {
  private transporter: Transporter;

  constructor(config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth:
        config.user && config.pass
          ? { user: config.user, pass: config.pass }
          : undefined,
      tls: { rejectUnauthorized: config.rejectUnauthorized },
    });
  }

  public emails = {
    send: async (options: MailOptions): Promise<EmailResponse> => {
      if (!options.body) {
        throw new EmailError(
          "SMTP mailer requires a rendered body (templateId is not supported)",
          "MISSING_BODY",
        );
      }

      try {
        const info = await this.transporter.sendMail({
          from: options.from,
          to: options.to,
          subject: options.subject,
          html: options.body,
          attachments: options.attachments?.map((attachment) => ({
            filename: attachment.name,
            content: attachment.content,
            encoding: "base64",
            contentType: attachment.type,
          })),
        });

        return {
          success: true,
          message: "Email sent successfully",
          data: { messageId: info.messageId },
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "SMTP delivery failed";
        throw new EmailError(message, "SMTP_ERROR");
      }
    },
  };

  public contacts = {
    list: async (): Promise<Contact[]> => [],
    create: async (options: CreateContactOptions): Promise<Contact> =>
      noopContact(options.email, options.subscribed, options.data),
    get: async (id: string): Promise<Contact> => noopContact(id, true),
    update: async (options: UpdateContactOptions): Promise<Contact> =>
      noopContact(options.email ?? options.id ?? "", options.subscribed ?? true, options.data),
    delete: async (id: string): Promise<Contact> => noopContact(id, false),
    addToSegment: async (): Promise<void> => {},
  };
}

function noopContact(
  email: string,
  subscribed: boolean,
  data: Record<string, unknown> = {},
): Contact {
  const now = new Date().toISOString();
  return { id: email, email, subscribed, data, createdAt: now, updatedAt: now };
}
