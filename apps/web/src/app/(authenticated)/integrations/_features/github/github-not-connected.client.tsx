"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { GithubIcon } from "@workspace/ui/components/icons/github-icon";
import { Link2 } from "lucide-react";
import { toast } from "sonner";

type GitHubNotConnectedProps = {
  githubAppName: string | null;
};

export function GitHubNotConnected({ githubAppName }: GitHubNotConnectedProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const installationsQuery = useQuery(
    trpc.authenticated.integrations.github.listAppInstallations.queryOptions(undefined, {
      enabled: !!githubAppName,
    }),
  );

  const connect = useMutation(
    trpc.authenticated.integrations.github.connectInstallation.mutationOptions({
      onSuccess: () => {
        toast.success("GitHub connected");
        void queryClient.invalidateQueries({
          queryKey: trpc.authenticated.integrations.github.getInstallation.queryKey(),
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

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

  const existing = installationsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      {existing.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-sm">
            The GitHub App is already installed on these accounts. Connect one to
            this organization — the same installation can serve several
            organizations.
          </p>
          <ul className="flex flex-col gap-2">
            {existing.map((installation) => (
              <li
                key={installation.installationId}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {installation.accountAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={installation.accountAvatarUrl}
                      alt=""
                      className="size-8 rounded-full"
                    />
                  ) : (
                    <GithubIcon className="size-8" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{installation.accountLogin}</div>
                    <div className="text-muted-foreground text-xs">
                      {installation.accountType} · installation #{installation.installationId}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={installation.connectedHere ? "outline" : "default"}
                  disabled={installation.connectedHere || connect.isPending}
                  onClick={() => connect.mutate({ installationId: installation.installationId })}
                >
                  <Link2 className="size-3.5" />
                  {installation.connectedHere ? "Connected" : "Use this installation"}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-muted-foreground text-sm">
        {existing.length > 0
          ? "Or install the App on another GitHub account or organization:"
          : "No GitHub account connected. Install the Faster Fixes GitHub App to enable automatic issue creation from feedback."}
      </p>
      <Button asChild variant={existing.length > 0 ? "outline" : "default"} className="w-fit">
        <a
          href={`https://github.com/apps/${githubAppName}/installations/new`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <GithubIcon className="size-4" />
          {existing.length > 0 ? "Install on another account" : "Connect to GitHub"}
        </a>
      </Button>
    </div>
  );
}
