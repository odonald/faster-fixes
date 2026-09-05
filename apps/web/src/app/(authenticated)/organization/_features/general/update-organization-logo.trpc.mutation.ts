"use server";

import { storage } from "@/server/storage";
import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput, TRPCError } from "@trpc/server";
import z from "zod";

const UpdateOrganizationLogoSchema = z.object({
  organizationId: z.string(),
});

export const updateOrganizationLogo = protectedProcedure
  .input(UpdateOrganizationLogoSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma, session } = ctx;

    const membership = await prisma.member.findFirst({
      where: {
        organizationId: input.organizationId,
        userId: session.user.id,
        role: { in: ["owner", "admin"] },
      },
    });

    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "You do not have permission to edit this organization.",
      });
    }

    // Delete previous logo object if one exists
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: input.organizationId },
      select: { logo: true },
    });

    if (org.logo) {
      try {
        await storage.delete(org.logo);
      } catch (error) {
        console.error(
          `Failed to delete old logo (key=${org.logo}):`,
          error,
        );
      }
    }
  });

export type UpdateOrganizationLogoOutput = inferProcedureOutput<
  typeof updateOrganizationLogo
>;
