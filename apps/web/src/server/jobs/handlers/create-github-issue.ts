import {
  buildGitHubIssueContent,
  issueContentInclude,
} from "@/server/github/build-issue-content";
import { getInstallationOctokit } from "@/server/github/github-app";
import { prisma } from "@workspace/db";
import { defineJob } from "@/server/jobs/define";

export const createGitHubIssue = defineJob(
  {
    id: "create-github-issue",
    retries: 3,
    concurrencyKey: (data) => `${data.feedbackId}`,
    triggers: [
      // The widget uploads the screenshot in the background right after
      // creating the feedback; wait so the issue is born with the image.
      { event: "feedback/created", delaySeconds: 15 },
      {
        event: "feedback/integration-issue-requested",
        if: (data) => data.target === "github",
      },
    ],
  },
  async ({ event }) => {
    const { feedbackId } = event.data;

    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: {
        project: {
          include: {
            gitHubLink: {
              include: { gitHubInstallation: true },
            },
          },
        },
        ...issueContentInclude,
        issueLink: { select: { id: true } },
      },
    });

    if (!feedback) return { skipped: "feedback_not_found" };

    // Handler-level idempotency closes the duplicate-issue footgun: any future
    // emit of `feedback/created` (backfills, admin re-triggers) will short-circuit
    // here instead of creating a second GH issue.
    if (feedback.issueLink) {
      return { skipped: "github_issue_already_exists" };
    }

    const gitHubLink = feedback.project.gitHubLink;
    if (!gitHubLink) return { skipped: "no_github_link" };

    // Auto-create only on `feedback/created`. Manual trigger
    // (`feedback/integration-issue-requested`) bypasses the auto-create switch.
    const isManualTrigger =
      event.name === "feedback/integration-issue-requested";
    if (!isManualTrigger && !gitHubLink.autoCreateIssues) {
      return { skipped: "auto_create_disabled" };
    }

    const installation = gitHubLink.gitHubInstallation;
    const octokit = getInstallationOctokit(installation.installationId);

    const { title, body } = await buildGitHubIssueContent(feedback);

    const response = await octokit.request(
      "POST /repos/{owner}/{repo}/issues",
      {
        owner: gitHubLink.repoOwner,
        repo: gitHubLink.repoName,
        title,
        body,
        labels: gitHubLink.defaultLabels,
      },
    );

    const issue = response.data as {
      number: number;
      html_url: string;
      node_id: string;
    };

    await prisma.feedbackIssueLink.create({
      data: {
        feedbackId: feedback.id,
        projectGitHubLinkId: gitHubLink.id,
        issueNumber: issue.number,
        issueUrl: issue.html_url,
        issueState: "open",
        issueNodeId: issue.node_id,
        lastSyncSource: "app",
        lastSyncAt: new Date(),
      },
    });

    return { issueNumber: issue.number, issueUrl: issue.html_url };
  },
);
