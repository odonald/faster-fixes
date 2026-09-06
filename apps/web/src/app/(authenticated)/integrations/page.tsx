import { GithubIcon } from "@workspace/ui/components/icons/github-icon";
import { JiraIcon } from "@workspace/ui/components/icons/jira-icon";
import { LinearIcon } from "@workspace/ui/components/icons/linear-icon";
import { McpIcon } from "@workspace/ui/components/icons/mcp-icon";
import { SlackIcon } from "@workspace/ui/components/icons/slack-icon";
import { DashboardSection } from "@/app/(authenticated)/_features/dashboard/dashboard-section";
import { DashboardPageContent } from "@/app/_features/core/dashboard/dashboard-page-content";
import { AgentTokensSection } from "./_features/agent-tokens/agent-tokens-section.client";
import { GitHubIntegrationSection } from "./_features/github/github-integration-section.client";
import { JiraIntegrationSection } from "./_features/jira/jira-integration-section.client";
import { LinearIntegrationSection } from "./_features/linear/linear-integration-section.client";
import { McpSetupGuide } from "./_features/mcp/mcp-setup-guide.client";
import { SlackIntegrationSection } from "./_features/slack/slack-integration-section.client";

export default function IntegrationsPage() {
  // Read at request time on the server so self-hosted installs can set it
  // without rebuilding the image. NEXT_PUBLIC_ kept for existing configs.
  const githubAppName =
    process.env.GITHUB_APP_NAME || process.env.NEXT_PUBLIC_GITHUB_APP_NAME || null;
  const instanceUrl = (
    process.env.BETTER_AUTH_URL ??
    process.env.BASE_URL ??
    "https://www.faster-fixes.com"
  ).replace(/\/$/, "");

  return (
    <DashboardPageContent breadcrumbs={[{ label: "Integrations" }]}>
      <div className="flex flex-col gap-12">
        <DashboardSection
          title={
            <span className="flex items-center gap-2.5">
              <GithubIcon className="size-6 shrink-0" />
              GitHub
            </span>
          }
          description="Connect your GitHub account to automatically create issues from feedback."
          cardTitle="GitHub integration"
          cardClassName="lg:max-w-lg"
        >
          <GitHubIntegrationSection githubAppName={githubAppName} />
        </DashboardSection>

        <DashboardSection
          title={
            <span className="flex items-center gap-2.5">
              <LinearIcon colored className="size-6 shrink-0" />
              Linear
            </span>
          }
          description="Connect your Linear workspace to mirror feedback into Linear as issues."
          cardTitle="Linear integration"
          cardClassName="lg:max-w-lg"
        >
          <LinearIntegrationSection />
        </DashboardSection>

        <DashboardSection
          title={
            <span className="flex items-center gap-2.5">
              <JiraIcon colored className="size-6 shrink-0" />
              Jira
            </span>
          }
          description="Connect your Jira Cloud site to mirror feedback into Jira as issues."
          cardTitle="Jira integration"
          cardClassName="lg:max-w-lg"
        >
          <JiraIntegrationSection />
        </DashboardSection>

        <DashboardSection
          title={
            <span className="flex items-center gap-2.5">
              <SlackIcon colored className="size-6 shrink-0" />
              Slack
            </span>
          }
          description="Connect your Slack workspace to get a message when new feedback arrives."
          cardTitle="Slack integration"
          cardClassName="lg:max-w-lg"
        >
          <SlackIntegrationSection />
        </DashboardSection>

        <DashboardSection
          title={
            <span className="flex items-center gap-2.5">
              <McpIcon className="size-6 shrink-0" />
              MCP Server
            </span>
          }
          description={
            <>
              API tokens for authenticating the Faster Fixes MCP server.{" "}
              <a
                href="/docs/mcp/setup"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                Setup guide
              </a>
            </>
          }
          cardTitle="MCP Server"
          cardClassName="lg:max-w-lg"
        >
          <AgentTokensSection />
        </DashboardSection>

        <DashboardSection
          title="Connect a coding agent"
          description="How to wire Claude Code, Cursor or VS Code to this instance – and what to repeat for each new project."
          cardTitle="Setup guide"
          cardClassName="lg:max-w-2xl"
        >
          <McpSetupGuide instanceUrl={instanceUrl} />
        </DashboardSection>
      </div>
    </DashboardPageContent>
  );
}
