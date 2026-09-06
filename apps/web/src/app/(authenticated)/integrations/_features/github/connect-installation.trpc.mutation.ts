"use server";

import { auth } from "@/server/auth";
import { getAppOctokit } from "@/server/github/github-app";
import { protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError, inferProcedureOutput } from "@trpc/server";
import { headers } from "next/headers";
import z from "zod";

/** Connect an existing installation of the GitHub App to the active organisation. */
export const connectInstallation = protectedProcedure
  .input(z.object({ installationId: z.number().int().positive() }))
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;

    const activeOrganization = await auth.api.getFullOrganization({
      headers: await headers(),
    });
    if (!activeOrganization) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization." });
    }

    const membership = await prisma.member.findFirst({
      where: {
        organizationId: activeOrganization.id,
        userId: session.user.id,
        role: { in: ["owner", "admin"] },
      },
    });
    if (!membership) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
    }

    // Verify with GitHub that this installation belongs to our App.
    let account: { login: string; type?: string; avatar_url?: string };
    try {
      const octokit = getAppOctokit();
      const response = await octokit.request("GET /app/installations/{installation_id}", {
        installation_id: input.installationId,
      });
      const data = response.data as { account: typeof account | null };
      if (!data.account) throw new Error("installation has no account");
      account = data.account;
    } catch {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "GitHub does not know this installation for your App.",
      });
    }

    await prisma.gitHubInstallation.upsert({
      where: {
        organizationId_installationId: {
          organizationId: activeOrganization.id,
          installationId: input.installationId,
        },
      },
      update: {
        accountLogin: account.login,
        accountType: account.type ?? "User",
        accountAvatarUrl: account.avatar_url ?? null,
      },
      create: {
        organizationId: activeOrganization.id,
        installationId: input.installationId,
        accountLogin: account.login,
        accountType: account.type ?? "User",
        accountAvatarUrl: account.avatar_url ?? null,
        installedById: membership.id,
      },
    });

    return { success: true };
  });

export type ConnectInstallationOutput = inferProcedureOutput<typeof connectInstallation>;
