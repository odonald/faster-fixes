"use server";

import { auth } from "@/server/auth";
import { sendEvent } from "@/server/jobs";
import { getAccessibleResources } from "@/server/jira/jira-client";
import { getValidJiraAccessToken } from "@/server/jira/token-access";
import { protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError, inferProcedureOutput } from "@trpc/server";
import { headers } from "next/headers";
import { SelectJiraSiteSchema } from "./select-jira-site.schema";

export const selectJiraSite = protectedProcedure
  .input(SelectJiraSiteSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;

    const activeOrganization = await auth.api.getFullOrganization({
      headers: await headers(),
    });

    if (!activeOrganization) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active organization.",
      });
    }

    const membership = await prisma.member.findFirst({
      where: {
        organizationId: activeOrganization.id,
        userId: session.user.id,
        role: { in: ["owner", "admin"] },
      },
    });

    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only owners and admins can configure Jira.",
      });
    }

    // Re-fetch accessible resources and resolve the chosen site from them so the
    // stored site URL/name always come from Atlassian, never from client input.
    const accessToken = await getValidJiraAccessToken(activeOrganization.id);
    const resources = await getAccessibleResources(accessToken);
    const site = resources.find((resource) => resource.id === input.cloudId);

    if (!site) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Selected site is no longer accessible.",
      });
    }

    const installation = await prisma.jiraInstallation.update({
      where: { organizationId: activeOrganization.id },
      data: {
        cloudId: site.id,
        siteUrl: site.url,
        siteName: site.name,
        healthState: "connected",
        reconnectNotifiedAt: null,
      },
      select: { id: true },
    });

    // This is the second half of the reconnect flow for multi-site grants, so it
    // owes the same webhook renewal the single-site callback does.
    await sendEvent({
      name: "jira/webhooks.refresh-requested",
      data: { installationId: installation.id },
    });

    return { success: true };
  });

export type SelectJiraSiteOutput = inferProcedureOutput<typeof selectJiraSite>;
