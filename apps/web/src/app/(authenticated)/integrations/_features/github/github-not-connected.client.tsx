"use client";

import { Button } from "@workspace/ui/components/button";
import { GithubIcon } from "@workspace/ui/components/icons/github-icon";

type GitHubNotConnectedProps = {
  githubAppName: string | null;
};

export function GitHubNotConnected({ githubAppName }: GitHubNotConnectedProps) {
  if (!githubAppName) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">
          The GitHub integration is not configured on this instance. Create a
          GitHub App and set <code>GITHUB_APP_ID</code>,{" "}
          <code>GITHUB_PRIVATE_KEY</code>, <code>GITHUB_WEBHOOK_SECRET</code>{" "}
          and <code>GITHUB_APP_NAME</code> (the app&apos;s URL slug), then
          restart.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        No GitHub account connected. Install the Faster Fixes GitHub App to
        enable automatic issue creation from feedback.
      </p>
      <Button asChild>
        <a
          href={`https://github.com/apps/${githubAppName}/installations/new`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <GithubIcon className="size-4" />
          Connect to GitHub
        </a>
      </Button>
    </div>
  );
}
