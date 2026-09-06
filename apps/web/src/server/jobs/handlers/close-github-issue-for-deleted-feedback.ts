import { getInstallationOctokit } from "@/server/github/github-app";
import { defineJob } from "@/server/jobs/define";

/**
 * A deleted feedback has no status to mirror any more, so its GitHub issue
 * is closed as "not planned" with a note saying why. The issue itself is kept:
 * the GitHub API cannot delete issues, and the history is worth having.
 */
export const closeGitHubIssueForDeletedFeedback = defineJob(
  {
    id: "close-github-issue-for-deleted-feedback",
    retries: 3,
    concurrencyKey: (data) => `${data.feedbackId}`,
    triggers: [{ event: "feedback/deleted", if: (data) => !!data.github }],
  },
  async ({ event }) => {
    const { github, actor } = event.data;
    if (!github) return { skipped: "no_github_issue" };

    const octokit = getInstallationOctokit(github.installationId);
    const issue = {
      owner: github.repoOwner,
      repo: github.repoName,
      issue_number: github.issueNumber,
    };

    const current = await octokit.request(
      "GET /repos/{owner}/{repo}/issues/{issue_number}",
      issue,
    );
    const state = (current.data as { state: string }).state;

    const by =
      actor === "reviewer"
        ? "the reviewer who reported it"
        : "a member of the project";
    await octokit.request(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
      {
        ...issue,
        body: `The feedback behind this issue was deleted in Faster Fixes by ${by}. Closing as not planned.`,
      },
    );

    if (state !== "closed") {
      await octokit.request(
        "PATCH /repos/{owner}/{repo}/issues/{issue_number}",
        { ...issue, state: "closed", state_reason: "not_planned" },
      );
    }

    return { issueNumber: github.issueNumber, wasOpen: state !== "closed" };
  },
);
