import "server-only";

import { createMailer } from "./mailer-factory";
import type { Mailer } from "./types";

let cached: Mailer | null = null;

/**
 * Lazily constructed so importing this module (e.g. during `next build` or
 * from a route that never sends mail) does not require mail credentials.
 */
export const mailer: Mailer = new Proxy({} as Mailer, {
  get(_target, prop, receiver) {
    if (!cached) cached = createMailer();
    return Reflect.get(cached, prop, receiver);
  },
});

// Re-export types for convenience
export type {
  AddContactToSegmentOptions,
  Contact,
  CreateContactOptions,
  EmailAttachment,
  EmailResponse,
  Mailer,
  MailOptions,
  UpdateContactOptions,
} from "./types";
export { EmailError } from "./types";
