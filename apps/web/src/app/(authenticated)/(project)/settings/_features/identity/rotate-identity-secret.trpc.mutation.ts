"use server";

import { generateIdentitySecret } from "@/server/api/verify-identity";
import { protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError, inferProcedureOutput } from "@trpc/server";
import z from "zod";

/** Creates or replaces the project's identity secret. Rotating invalidates blobs signed with the old one immediately. */
export const rotateIdentitySecret = protectedProcedure
  .input(z.object({ projectId: z.string(), disable: z.boolean().optional() }))
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;

    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
    }

    const membership = await prisma.member.findFirst({
      where: {
        organizationId: project.organizationId,
        userId: session.user.id,
        role: { in: ["owner", "admin"] },
      },
    });
    if (!membership) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
    }

    const identitySecret = input.disable ? null : generateIdentitySecret();
    await prisma.project.update({
      where: { id: input.projectId },
      data: { identitySecret },
    });

    return { identitySecret };
  });

export type RotateIdentitySecretOutput = inferProcedureOutput<typeof rotateIdentitySecret>;
