import "server-only";

import { PlunkMailer } from "./plunk";
import { ResendMailer } from "./resend";
import { SmtpMailer, smtpConfigFromEnv } from "./smtp";
import { Mailer } from "./types";

type MailerProvider = "smtp" | "resend" | "plunk";

/**
 * Selects the transactional mail provider.
 *
 * `MAIL_PROVIDER` wins when set. Otherwise the provider is inferred from which
 * credentials exist, so existing Resend/Plunk deployments keep working with no
 * config change and self-hosted installs only need `SMTP_HOST`.
 */
function resolveProvider(): MailerProvider {
  const explicit = process.env.MAIL_PROVIDER?.toLowerCase();
  if (explicit === "smtp" || explicit === "resend" || explicit === "plunk") {
    return explicit;
  }
  if (process.env.SMTP_HOST) return "smtp";
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.PLUNK_SECRET_KEY) return "plunk";
  throw new Error(
    "No mail provider configured. Set SMTP_HOST (recommended for self-hosting), RESEND_API_KEY, or PLUNK_SECRET_KEY.",
  );
}

export function createMailer(): Mailer {
  const provider = resolveProvider();

  switch (provider) {
    case "smtp":
      return new SmtpMailer(smtpConfigFromEnv());
    case "plunk":
      return new PlunkMailer(process.env.PLUNK_SECRET_KEY!);
    case "resend":
      return new ResendMailer(process.env.RESEND_API_KEY!);
    default:
      throw new Error(`Unsupported mailer provider: ${provider satisfies never}`);
  }
}
