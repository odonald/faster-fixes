import type { JobDefinition } from "./define";
import type { EventName } from "./events";
import { addContactToSegment } from "./handlers/add-contact-to-segment";
import { closeGitHubIssueForDeletedFeedback } from "./handlers/close-github-issue-for-deleted-feedback";
import { createGitHubIssue } from "./handlers/create-github-issue";
import { createJiraIssue } from "./handlers/create-jira-issue";
import { createLinearIssue } from "./handlers/create-linear-issue";
import { handleJiraOAuthRevoked } from "./handlers/handle-jira-oauth-revoked";
import { handleLinearOAuthRevoked } from "./handlers/handle-linear-oauth-revoked";
import { notifySlackFeedbackCreated } from "./handlers/notify-slack-feedback-created";
import { refreshJiraInstallationWebhooks } from "./handlers/refresh-jira-installation-webhooks";
import { refreshJiraWebhooks } from "./handlers/refresh-jira-webhooks";
import { sendWelcomeEmail } from "./handlers/send-welcome-email";
import { syncFeedbackStatusToGitHub } from "./handlers/sync-feedback-status-to-github";
import { syncFeedbackStatusToJira } from "./handlers/sync-feedback-status-to-jira";
import { syncFeedbackStatusToLinear } from "./handlers/sync-feedback-status-to-linear";
import { syncGitHubIssueStatus } from "./handlers/sync-github-issue-status";
import { syncJiraIssueStatus } from "./handlers/sync-jira-issue-status";
import { syncLinearIssueStatus } from "./handlers/sync-linear-issue-status";
import { updateGitHubIssueScreenshot } from "./handlers/update-github-issue-screenshot";
import { updateSlackFeedbackMessage } from "./handlers/update-slack-feedback-message";

export const allJobs: JobDefinition[] = [
  createGitHubIssue,
  syncGitHubIssueStatus,
  syncFeedbackStatusToGitHub,
  closeGitHubIssueForDeletedFeedback,
  updateGitHubIssueScreenshot,
  createLinearIssue,
  syncLinearIssueStatus,
  syncFeedbackStatusToLinear,
  handleLinearOAuthRevoked,
  createJiraIssue,
  syncJiraIssueStatus,
  syncFeedbackStatusToJira,
  handleJiraOAuthRevoked,
  refreshJiraWebhooks,
  refreshJiraInstallationWebhooks,
  sendWelcomeEmail,
  addContactToSegment,
  notifySlackFeedbackCreated,
  updateSlackFeedbackMessage,
];

const byEvent = new Map<EventName, JobDefinition[]>();
for (const job of allJobs) {
  for (const trigger of job.eventTriggers) {
    const list = byEvent.get(trigger.event) ?? [];
    list.push(job);
    byEvent.set(trigger.event, list);
  }
}

export function getJobsForEvent(event: EventName): JobDefinition[] {
  return byEvent.get(event) ?? [];
}
