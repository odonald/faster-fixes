"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput, TRPCError } from "@trpc/server";
import z from "zod";

const RECENT_LIMIT = 3;

/**
 * Everything the organisation overview needs in one round trip: per-project
 * status counts, latest activity, reviewer and integration state, and the last
 * few feedback items.
 */
export const getProjectsOverview = protectedProcedure
  .input(z.object({ organizationId: z.string() }))
  .query(async ({ input, ctx }) => {
    const { prisma, session } = ctx;

    const membership = await prisma.member.findFirst({
      where: { organizationId: input.organizationId, userId: session.user.id },
    });
    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have access to this organization.",
      });
    }

    const projects = await prisma.project.findMany({
      where: { organizationId: input.organizationId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        domain: true,
        createdAt: true,
        gitHubLink: { select: { repoOwner: true, repoName: true } },
        linearLink: { select: { id: true } },
        jiraLink: { select: { id: true } },
        slackLink: { select: { id: true } },
        _count: { select: { reviewers: { where: { isActive: true } } } },
        feedback: {
          orderBy: { createdAt: "desc" },
          take: RECENT_LIMIT,
          select: {
            id: true,
            comment: true,
            status: true,
            createdAt: true,
            pageUrl: true,
            reviewer: { select: { name: true } },
          },
        },
      },
    });

    const projectIds = projects.map((p) => p.id);
    const statusCounts = projectIds.length
      ? await prisma.feedback.groupBy({
          by: ["projectId", "status"],
          where: { projectId: { in: projectIds } },
          _count: { _all: true },
        })
      : [];

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const resolvedThisWeek = projectIds.length
      ? await prisma.feedback.groupBy({
          by: ["projectId"],
          where: {
            projectId: { in: projectIds },
            status: { in: ["resolved", "closed"] },
            updatedAt: { gte: weekAgo },
          },
          _count: { _all: true },
        })
      : [];

    const countsFor = (projectId: string) => {
      const counts = { new: 0, in_progress: 0, resolved: 0, closed: 0 };
      for (const row of statusCounts) {
        if (row.projectId !== projectId) continue;
        if (row.status in counts) {
          counts[row.status as keyof typeof counts] = row._count._all;
        }
      }
      return counts;
    };

    return projects.map((p) => {
      const counts = countsFor(p.id);
      return {
        id: p.id,
        name: p.name,
        domain: p.domain,
        createdAt: p.createdAt,
        counts,
        open: counts.new + counts.in_progress,
        total: counts.new + counts.in_progress + counts.resolved + counts.closed,
        resolvedThisWeek:
          resolvedThisWeek.find((r) => r.projectId === p.id)?._count._all ?? 0,
        lastFeedbackAt: p.feedback[0]?.createdAt ?? null,
        activeReviewers: p._count.reviewers,
        integrations: {
          github: p.gitHubLink
            ? `${p.gitHubLink.repoOwner}/${p.gitHubLink.repoName}`
            : null,
          linear: Boolean(p.linearLink),
          jira: Boolean(p.jiraLink),
          slack: Boolean(p.slackLink),
        },
        recent: p.feedback.map((f) => ({
          id: f.id,
          comment: f.comment,
          status: f.status,
          createdAt: f.createdAt,
          pageUrl: f.pageUrl,
          reviewerName: f.reviewer.name,
        })),
      };
    });
  });

export type GetProjectsOverviewOutput = inferProcedureOutput<
  typeof getProjectsOverview
>;
export type ProjectOverview = GetProjectsOverviewOutput[number];
