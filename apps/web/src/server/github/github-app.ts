import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/core";

// Read on first use, not at import: the GitHub integration is optional on
// self-hosted installs and `next build` evaluates this module while
// collecting page data.
function getAppCredentials() {
  const appId = process.env.GITHUB_APP_ID;
  const rawKey = process.env.GITHUB_PRIVATE_KEY;
  if (!appId || !rawKey) {
    throw new Error(
      "GitHub integration is not configured. Set GITHUB_APP_ID and GITHUB_PRIVATE_KEY.",
    );
  }
  return { appId, privateKey: rawKey.replace(/\\n/g, "\n") };
}

export function getAppOctokit() {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: getAppCredentials(),
  });
}

export function getInstallationOctokit(installationId: number) {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: { ...getAppCredentials(), installationId },
  });
}
