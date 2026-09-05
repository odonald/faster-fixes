import { Inngest } from "inngest";

/**
 * Background jobs run on Inngest. It is optional for self-hosted installs:
 *
 * - development: the SDK talks to a local `inngest dev` server, no keys needed.
 * - production with INNGEST_EVENT_KEY + INNGEST_SIGNING_KEY: Inngest Cloud, or a
 *   self-hosted Inngest server via INNGEST_BASE_URL.
 * - production without keys: jobs are disabled. `inngest.send` becomes a no-op
 *   and the few flows that must not be lost (welcome email) run inline. The
 *   GitHub / Linear / Jira / Slack syncs are unavailable in this mode.
 */
export const INNGEST_ENABLED =
  process.env.NODE_ENV !== "production" ||
  Boolean(process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY);

export function isInngestEnabled(): boolean {
  return INNGEST_ENABLED;
}

// v4 defaults to cloud mode, which requires a signing key. Use the local
// dev server during development so we don't need credentials there.
// Checkpointing is on by default in v4; cap it below the route's maxDuration
// so steps checkpoint gracefully before serverless hosts kill the request.
export const inngest = new Inngest({
  id: "faster-fixes",
  isDev: process.env.NODE_ENV !== "production",
  checkpointing: { maxRuntime: "50s" },
});

if (!INNGEST_ENABLED) {
  // Every call site does `inngest.send(...)`; swallowing here keeps them
  // untouched and avoids a failed HTTP call to api.inngest.com on each event.
  const disabledSend = async () => ({ ids: [] as string[] });
  (inngest as unknown as { send: typeof disabledSend }).send = disabledSend;
}
