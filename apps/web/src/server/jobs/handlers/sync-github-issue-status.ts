import { prisma } from "@workspace/db";
import { defineJob } from "@/server/jobs/define";
import { sendEvent } from "@/server/jobs/send";

const SYNC_LOOP_WINDOW_MS = 30_000;

export const syncGitHubIssueStatus = defineJob(
  {
    id: "sync-github-issue-status",
    retries: 3,
    concurrencyKey: (data) => `${data.repoFullName}:${data.issueNumber}`,
    triggers: [{ event: "github/webhook.issues" }],
  },
  async ({ event }) => {
    const { action, issueNumber, repoFullName } = event.data;

    const issueLink = await prisma.feedbackIssueLink.findFirst({
      where: {
        issueNumber,
        projectGitHubLink: { repoFullName },
      },
    });

    if (!issueLink) return { skipped: "no_matching_issue_link" };

    // Prevent sync loop: skip if we triggered this change from the app
    if (
      issueLink.lastSyncSource === "app" &&
      issueLink.lastSyncAt &&
      Date.now() - issueLink.lastSyncAt.getTime() < SYNC_LOOP_WINDOW_MS
    ) {
      return { skipped: "sync_loop_prevention" };
    }

    let newStatus: string;
    if (action === "closed") {
      newStatus = "resolved";
    } else if (action === "reopened") {
      newStatus = "in_progress";
    } else {
      return { skipped: "unhandled_action" };
    }

    await prisma.$transaction([
      prisma.feedback.update({
        where: { id: issueLink.feedbackId },
        data: { status: newStatus },
      }),
      prisma.feedbackIssueLink.update({
        where: { id: issueLink.id },
        data: {
          issueState: action === "closed" ? "closed" : "open",
          lastSyncSource: "github",
          lastSyncAt: new Date(),
        },
      }),
    ]);

    // Propagate to other trackers (e.g. Linear) so the feedback stays canonical.
    await sendEvent({
      name: "feedback/status-changed",
      data: {
        feedbackId: issueLink.feedbackId,
        newStatus,
        origin: "github",
        // Change originated from the GitHub issue webhook syncing back.
        actor: "tracker",
      },
    });

    return { feedbackId: issueLink.feedbackId, newStatus };
  },
);
