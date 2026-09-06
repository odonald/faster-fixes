"use client";

import type { ProjectOverview } from "@/app/(authenticated)/(project)/_utils/get-projects-overview.trpc.query";
import { useActiveProject } from "@/app/_features/project/active-project-provider.client";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { GithubIcon } from "@workspace/ui/components/icons/github-icon";
import { JiraIcon } from "@workspace/ui/components/icons/jira-icon";
import { LinearIcon } from "@workspace/ui/components/icons/linear-icon";
import { SlackIcon } from "@workspace/ui/components/icons/slack-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";
import { ArrowUpRight, Inbox, Settings2, Users } from "lucide-react";
import { useRouter } from "next/navigation";

const STATUS_META: Record<string, { label: string; dot: string; bar: string }> = {
  new: { label: "New", dot: "bg-primary", bar: "bg-primary" },
  in_progress: { label: "In progress", dot: "bg-amber-500", bar: "bg-amber-500" },
  resolved: { label: "Resolved", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  closed: { label: "Closed", dot: "bg-muted-foreground/50", bar: "bg-muted-foreground/40" },
};

export function ProjectCard({ project }: { project: ProjectOverview }) {
  const router = useRouter();
  const { setActiveProject } = useActiveProject();

  const go = (href: "/inbox" | "/reviewers" | "/settings", feedbackId?: string) => {
    setActiveProject(project.id);
    router.push(feedbackId ? `${href}?feedbackId=${feedbackId}` : href);
  };

  const segments = (["new", "in_progress", "resolved", "closed"] as const)
    .map((key) => ({ key, count: project.counts[key] }))
    .filter((s) => s.count > 0);

  return (
    <article
      className={cn(
        "bg-card text-card-foreground group flex flex-col rounded-xl border shadow-xs transition-shadow hover:shadow-md",
        project.counts.new > 0 && "border-primary/30",
      )}
    >
      <header className="flex items-start justify-between gap-3 p-5 pb-4">
        <button
          type="button"
          onClick={() => go("/inbox")}
          className="min-w-0 text-left focus-visible:outline-none"
        >
          <h2 className="truncate text-base font-semibold leading-tight group-hover:underline group-hover:underline-offset-4">
            {project.name}
          </h2>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">{project.domain}</p>
        </button>
        {project.counts.new > 0 ? (
          <Badge>{project.counts.new} new</Badge>
        ) : (
          <Badge variant="secondary">Up to date</Badge>
        )}
      </header>

      <div className="px-5">
        <div className="bg-muted flex h-1.5 w-full overflow-hidden rounded-full">
          {project.total === 0 ? null : (
            segments.map((s) => (
              <div
                key={s.key}
                className={STATUS_META[s.key]!.bar}
                style={{ width: `${(s.count / project.total) * 100}%` }}
                title={`${STATUS_META[s.key]!.label}: ${s.count}`}
              />
            ))
          )}
        </div>
        <dl className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {(["new", "in_progress", "resolved"] as const).map((key) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={cn("size-1.5 rounded-full", STATUS_META[key]!.dot)} />
              <dt className="sr-only">{STATUS_META[key]!.label}</dt>
              <dd className="tabular-nums">
                <span className="text-foreground font-medium">{project.counts[key]}</span>{" "}
                {STATUS_META[key]!.label.toLowerCase()}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <ul className="mt-4 flex flex-1 flex-col divide-y border-t text-sm">
        {project.recent.length === 0 ? (
          <li className="text-muted-foreground px-5 py-4 text-xs">
            No feedback yet. Share a reviewer link to get the first report.
          </li>
        ) : (
          project.recent.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => go("/inbox", item.id)}
                className="hover:bg-muted/60 flex w-full items-start gap-3 px-5 py-2.5 text-left transition-colors"
              >
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    STATUS_META[item.status]?.dot ?? "bg-muted-foreground",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1">{item.comment}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {item.reviewerName} · {timeAgo(item.createdAt)}
                  </span>
                </span>
              </button>
            </li>
          ))
        )}
      </ul>

      <footer className="flex items-center justify-between gap-3 border-t px-5 py-3">
        <div className="text-muted-foreground flex min-w-0 items-center gap-2 text-xs">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1">
                <Users className="size-3.5" />
                {project.activeReviewers}
              </span>
            </TooltipTrigger>
            <TooltipContent>Active reviewers</TooltipContent>
          </Tooltip>
          <span aria-hidden>·</span>
          <IntegrationIcon
            active={Boolean(project.integrations.github)}
            label={project.integrations.github ? `GitHub · ${project.integrations.github}` : "GitHub not linked"}
          >
            <GithubIcon className="size-3.5" />
          </IntegrationIcon>
          <IntegrationIcon active={project.integrations.linear} label={project.integrations.linear ? "Linear linked" : "Linear not linked"}>
            <LinearIcon className="size-3.5" />
          </IntegrationIcon>
          <IntegrationIcon active={project.integrations.jira} label={project.integrations.jira ? "Jira linked" : "Jira not linked"}>
            <JiraIcon className="size-3.5" />
          </IntegrationIcon>
          <IntegrationIcon active={project.integrations.slack} label={project.integrations.slack ? "Slack linked" : "Slack not linked"}>
            <SlackIcon className="size-3.5" />
          </IntegrationIcon>
          {project.lastFeedbackAt && (
            <>
              <span aria-hidden>·</span>
              <span className="whitespace-nowrap">{timeAgo(project.lastFeedbackAt)}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon-xs" variant="ghost" aria-label="Reviewers" onClick={() => go("/reviewers")}>
            <Users className="size-3.5" />
          </Button>
          <Button size="icon-xs" variant="ghost" aria-label="Settings" onClick={() => go("/settings")}>
            <Settings2 className="size-3.5" />
          </Button>
          <Button size="sm" onClick={() => go("/inbox")}>
            <Inbox className="size-3.5" />
            Inbox
            <ArrowUpRight className="size-3" />
          </Button>
        </div>
      </footer>
    </article>
  );
}

function IntegrationIcon({
  active,
  label,
  children,
}: {
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("flex items-center", active ? "text-foreground" : "opacity-30")}>{children}</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function timeAgo(date: Date | string) {
  return formatDistanceToNowStrict(new Date(date), { addSuffix: true });
}
