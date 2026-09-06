import type { EventPayload } from "@/server/jobs/events";
import { prisma } from "@workspace/db";

/**
 * Build the `feedback/deleted` events for a set of feedback ids. Call it
 * *before* `prisma.feedback.delete`: the issue links cascade with the row and
 * the handlers need the repository and issue number to close the tracker
 * issue.
 */
export async function buildFeedbackDeletedEvents(
  feedbackIds: string[],
  actor: "reviewer" | "user",
): Promise<EventPayload<"feedback/deleted">[]> {
  if (feedbackIds.length === 0) return [];

  const links = await prisma.feedbackIssueLink.findMany({
    where: { feedbackId: { in: feedbackIds } },
    include: {
      projectGitHubLink: { include: { gitHubInstallation: true } },
    },
  });
  const githubByFeedback = new Map(links.map((l) => [l.feedbackId, l]));

  return feedbackIds.map((feedbackId) => {
    const link = githubByFeedback.get(feedbackId);
    return {
      name: "feedback/deleted",
      data: {
        feedbackId,
        actor,
        ...(link && {
          github: {
            installationId:
              link.projectGitHubLink.gitHubInstallation.installationId,
            repoOwner: link.projectGitHubLink.repoOwner,
            repoName: link.projectGitHubLink.repoName,
            issueNumber: link.issueNumber,
          },
        }),
      },
    };
  });
}
