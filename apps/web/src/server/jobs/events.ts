/**
 * Every background event the app emits, with its payload. Producers call
 * `sendEvent(name, data)`; job handlers subscribe with `defineJob`.
 */
export type Events = {
  "feedback/created": { feedbackId: string };
  "feedback/status-changed": {
    feedbackId: string;
    newStatus: string;
    /** Who changed it: a person in the inbox, an agent via the API, or a tracker webhook syncing back. */
    actor: "user" | "agent" | "tracker";
    /** Set when the change came from an external tracker, so the sync back to it is skipped. */
    origin?: "app" | "github" | "linear" | "jira";
  };
  "feedback/integration-issue-requested": {
    feedbackId: string;
    target: "github" | "linear" | "jira";
  };
  "user/email-verified": { userId: string };
  "github/webhook.issues": {
    action: string;
    issueNumber: number;
    issueState: string;
    repoFullName: string;
  };
  "linear/webhook.issue": {
    action: string;
    organizationId: string;
    installationId: string;
    issue: Record<string, unknown> | undefined;
  };
  "linear/oauth.revoked": { organizationId: string; installationId: string };
  "jira/webhook.issue": {
    installationId: string;
    issueId: string;
    webhookEvent: string;
  };
  "jira/oauth.revoked": { installationId: string };
  "jira/webhooks.refresh-requested": { installationId: string };
};

export type EventName = keyof Events;

export type EventPayload<N extends EventName = EventName> = {
  name: N;
  data: Events[N];
};
