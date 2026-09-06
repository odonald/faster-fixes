"use client";

import { DashboardPageContent } from "@/app/_features/core/dashboard/dashboard-page-content";
import { CreateProjectDialog } from "@/app/(authenticated)/_features/sidebar/project/create/create-project-dialog.client";
import { useActiveOrganization } from "@/lib/auth";
import { useTRPC } from "@/lib/trpc/trpc-client";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { CheckCircle2, FolderPlus, Inbox, Loader2, Plus, Users } from "lucide-react";
import type { ProjectOverview } from "@/app/(authenticated)/(project)/_utils/get-projects-overview.trpc.query";
import { ProjectCard } from "./project-card.client";

export function OverviewPage() {
  const trpc = useTRPC();
  const { data: activeOrg } = useActiveOrganization();

  const overviewQuery = useQuery(
    trpc.authenticated.projects.overview.queryOptions(
      { organizationId: activeOrg?.id ?? "" },
      { enabled: !!activeOrg?.id, refetchInterval: 60_000 },
    ),
  );

  return (
    <DashboardPageContent breadcrumbs={[{ label: "Overview" }]}>
      {matchQueryStatus(overviewQuery, {
        Loading: <OverviewSkeleton />,
        Errored: (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Could not load the overview</EmptyTitle>
              <EmptyDescription>Try refreshing the page.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ),
        Empty: (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderPlus />
              </EmptyMedia>
              <EmptyTitle>No projects yet</EmptyTitle>
              <EmptyDescription>
                A project is one website you collect feedback for. Create the
                first one to get a widget key and reviewer links.
              </EmptyDescription>
            </EmptyHeader>
            <CreateProjectDialog>
              <Button>
                <Plus className="size-4" />
                Create project
              </Button>
            </CreateProjectDialog>
          </Empty>
        ),
        Success: ({ data: projects }) => (
          <div className="flex flex-col gap-8">
            <header className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-foreground text-2xl font-bold tracking-tight">
                  {activeOrg?.name ?? "Organization"}
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  {projects.length} {projects.length === 1 ? "project" : "projects"} · what
                  needs attention across all of them.
                </p>
              </div>
              <CreateProjectDialog>
                <Button variant="outline">
                  <Plus className="size-4" />
                  New project
                </Button>
              </CreateProjectDialog>
            </header>

            <OrgStats projects={projects} />

            <section
              aria-label="Projects"
              className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
            >
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
              <CreateProjectDialog>
                <button
                  type="button"
                  className="border-border text-muted-foreground hover:border-primary/50 hover:text-foreground focus-visible:ring-ring/50 flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
                >
                  <Plus className="size-5" />
                  Add another project
                </button>
              </CreateProjectDialog>
            </section>
          </div>
        ),
      })}
    </DashboardPageContent>
  );
}

function OrgStats({ projects }: { projects: ProjectOverview[] }) {
  const totals = projects.reduce(
    (acc, p) => {
      acc.new += p.counts.new;
      acc.inProgress += p.counts.in_progress;
      acc.resolvedThisWeek += p.resolvedThisWeek;
      acc.reviewers += p.activeReviewers;
      return acc;
    },
    { new: 0, inProgress: 0, resolvedThisWeek: 0, reviewers: 0 },
  );

  const tiles = [
    { label: "New feedback", value: totals.new, icon: Inbox, tone: totals.new > 0 ? "attention" : "muted" },
    { label: "In progress", value: totals.inProgress, icon: Loader2, tone: "neutral" },
    { label: "Resolved this week", value: totals.resolvedThisWeek, icon: CheckCircle2, tone: "positive" },
    { label: "Active reviewers", value: totals.reviewers, icon: Users, tone: "neutral" },
  ] as const;

  return (
    <section aria-label="Organization totals" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="bg-card text-card-foreground flex items-center gap-4 rounded-xl border p-4 shadow-xs"
        >
          <div
            className={
              tile.tone === "attention"
                ? "bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg"
                : tile.tone === "positive"
                  ? "flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg"
            }
          >
            <tile.icon className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-semibold tabular-nums leading-none">{tile.value}</div>
            <div className="text-muted-foreground mt-1 truncate text-xs">{tile.label}</div>
          </div>
        </div>
      ))}
    </section>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[74px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-72 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
