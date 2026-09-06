"use server";

import { auth } from "@/server/auth";
import { getAppOctokit } from "@/server/github/github-app";
import { protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError, inferProcedureOutput } from "@trpc/server";
import { headers } from "next/headers";

/**
 * Every installation of this instance's GitHub App, as GitHub sees it. Lets a
 * second organisation connect an installation that already exists (the App is
 * installed once per GitHub account; GitHub's install page just reopens it).
 */
export const listAppInstallations = protectedProcedure.query(async ({ ctx }) => {
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

  if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_PRIVATE_KEY) return [];

  let installations: Array<{
    id: number;
    account: { login: string; type?: string; avatar_url?: string } | null;
  }>;
  try {
    const octokit = getAppOctokit();
    const response = await octokit.request("GET /app/installations", { per_page: 100 });
    installations = response.data as typeof installations;
  } catch (error) {
    console.error("[github] listing app installations failed:", error);
    return [];
  }

  const connectedHere = new Set(
    (
      await prisma.gitHubInstallation.findMany({
        where: { organizationId: activeOrganization.id },
        select: { installationId: true },
      })
    ).map((r) => r.installationId),
  );

  return installations
    .filter((i) => i.account)
    .map((i) => ({
      installationId: i.id,
      accountLogin: i.account!.login,
      accountType: i.account!.type ?? "User",
      accountAvatarUrl: i.account!.avatar_url ?? null,
      connectedHere: connectedHere.has(i.id),
    }));
});

export type ListAppInstallationsOutput = inferProcedureOutput<typeof listAppInstallations>;
