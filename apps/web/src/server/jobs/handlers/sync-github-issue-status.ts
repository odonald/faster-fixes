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

    // The issue is gone on GitHub: drop the link so later status changes stop
    // trying to PATCH a dead issue. The feedback itself keeps its status.
    if (action === "deleted") {
      await prisma.feedbackIssueLink.delete({ where: { id: issueLink.id } });
      return { feedbackId: issueLink.feedbackId, unlinked: true };
    }

    let newStatus: string;
    let newIssueState: "open" | "closed";
    if (action === "closed") {
      newStatus = "resolved";
      newIssueState = "closed";
    } else if (action === "reopened") {
      newStatus = "in_progress";
      newIssueState = "open";
    } else {
      return { skipped: "unhandled_action" };
    }

    // Echo detection: our own PATCH makes GitHub send this same webhook back.
    // That echo carries the state we just wrote, shortly after we wrote it.
    // A person closing the issue right after it was created is *not* an echo
    // (the link still says "open"), so the state has to match too.
    if (
      issueLink.lastSyncSource === "app" &&
      issueLink.lastSyncAt &&
      Date.now() - issueLink.lastSyncAt.getTime() < SYNC_LOOP_WINDOW_MS &&
      issueLink.issueState === newIssueState
    ) {
      return { skipped: "sync_loop_prevention" };
    }

    await prisma.$transaction([
      prisma.feedback.update({
        where: { id: issueLink.feedbackId },
        data: { status: newStatus },
      }),
      prisma.feedbackIssueLink.update({
        where: { id: issueLink.id },
        data: {
          issueState: newIssueState,
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
