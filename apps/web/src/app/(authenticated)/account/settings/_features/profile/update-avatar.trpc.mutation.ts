"use server";

import { storage } from "@/server/storage";
import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput } from "@trpc/server";

export const updateAvatar = protectedProcedure.mutation(async ({ ctx }) => {
  const { prisma, session } = ctx;

  // Delete previous avatar object if one exists
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { image: true },
  });

  if (user.image && !user.image.startsWith("http")) {
    try {
      await storage.delete(user.image);
    } catch (error) {
      console.error(
        `Failed to delete old avatar (key=${user.image}):`,
        error,
      );
    }
  }
});

export type UpdateAvatarOutput = inferProcedureOutput<typeof updateAvatar>;
