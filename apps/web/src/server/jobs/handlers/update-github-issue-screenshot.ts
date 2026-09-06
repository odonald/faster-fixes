import {
  buildGitHubIssueContent,
  issueContentInclude,
} from "@/server/github/build-issue-content";
import { getInstallationOctokit } from "@/server/github/github-app";
import { defineJob } from "@/server/jobs/define";
import { prisma } from "@workspace/db";

/**
 * The screenshot is uploaded after the feedback exists, so a slow capture can
 * miss the issue-creation window. When it lands, rewrite the issue body so the
 * image (with the burnt-in marker) shows up on GitHub as well.
 */
export const updateGitHubIssueScreenshot = defineJob(
  {
    id: "update-github-issue-screenshot",
    retries: 4,
    retryDelaySeconds: 20,
    concurrencyKey: (data) => `${data.feedbackId}`,
    triggers: [{ event: "feedback/screenshot-attached" }],
  },
  async ({ event }) => {
    const { feedbackId } = event.data;

    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: {
        ...issueContentInclude,
        project: { include: { gitHubLink: true } },
        issueLink: {
          include: {
            projectGitHubLink: { include: { gitHubInstallation: true } },
          },
        },
      },
    });

    if (!feedback) return { skipped: "feedback_not_found" };
    if (!feedback.screenshot) return { skipped: "no_screenshot" };
    if (!feedback.project.gitHubLink) return { skipped: "no_github_link" };

    if (!feedback.issueLink) {
      if (!feedback.project.gitHubLink.autoCreateIssues) {
        return { skipped: "auto_create_disabled" };
      }
      // The create job is still queued (it waits for this upload). Retry
      // later; once the issue exists the body gets the screenshot.
      throw new Error("GitHub issue not created yet; retrying");
    }

    const { issueLink } = feedback;
    const octokit = getInstallationOctokit(
      issueLink.projectGitHubLink.gitHubInstallation.installationId,
    );
    const { body } = await buildGitHubIssueContent(feedback);

    await octokit.request("PATCH /repos/{owner}/{repo}/issues/{issue_number}", {
      owner: issueLink.projectGitHubLink.repoOwner,
      repo: issueLink.projectGitHubLink.repoName,
      issue_number: issueLink.issueNumber,
      body,
    });

    return { issueNumber: issueLink.issueNumber };
  },
);
