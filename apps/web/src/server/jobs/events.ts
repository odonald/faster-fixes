/**
 * Every background event the app emits, with its payload. Producers call
 * `sendEvent(name, data)`; job handlers subscribe with `defineJob`.
 */
export type Events = {
  "feedback/created": { feedbackId: string };
  /** The widget uploaded its screenshot; this arrives a few seconds after `feedback/created`. */
  "feedback/screenshot-attached": { feedbackId: string };
  "feedback/status-changed": {
    feedbackId: string;
    newStatus: string;
    /** Who changed it: a person in the inbox, an agent via the API, or a tracker webhook syncing back. */
    actor: "user" | "agent" | "tracker";
    /** Set when the change came from an external tracker, so the sync back to it is skipped. */
    origin?: "app" | "github" | "linear" | "jira";
  };
  /**
   * Emitted just before a feedback row is deleted (widget, inbox hard delete).
   * The tracker links cascade away with the row, so the payload carries what
   * the handlers need to close the external issues.
   */
  "feedback/deleted": {
    feedbackId: string;
    /** Who deleted it: the reviewer in the widget or a member in the inbox. */
    actor: "reviewer" | "user";
    github?: {
      installationId: number;
      repoOwner: string;
      repoName: string;
      issueNumber: number;
    };
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
