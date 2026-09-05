import { auth } from "@/server/auth";
import { prisma } from "@workspace/db";

/**
 * Dashboard upload targets (avatars, logos). One definition drives both the
 * presigned-URL flow (S3 providers) and the direct multipart flow (database
 * provider), so authorization and limits cannot drift apart.
 */
export type UploadRouteName = "user-avatar" | "organization-logo";

export type UploadRouteDefinition = {
  fileTypes: string[];
  maxFileSize: number;
  /** Returns the object key, or a string error message to reject the upload. */
  authorize(input: {
    headers: Headers;
    fileType: string;
    metadata: Record<string, unknown>;
  }): Promise<{ key: string } | { error: string }>;
};

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const TWO_MB = 2 * 1024 * 1024;

function extension(fileType: string): string {
  return fileType.split("/")[1] ?? "png";
}

export const uploadRoutes: Record<UploadRouteName, UploadRouteDefinition> = {
  "user-avatar": {
    fileTypes: IMAGE_TYPES,
    maxFileSize: TWO_MB,
    async authorize({ headers, fileType }) {
      const session = await auth.api.getSession({ headers });
      if (!session) return { error: "Unauthorized" };
      return {
        key: `user-avatars/${session.user.id}/${Date.now()}.${extension(fileType)}`,
      };
    },
  },
  "organization-logo": {
    fileTypes: IMAGE_TYPES,
    maxFileSize: TWO_MB,
    async authorize({ headers, fileType, metadata }) {
      const organizationId = metadata.organizationId;
      if (typeof organizationId !== "string" || !organizationId) {
        return { error: "organizationId is required" };
      }
      const session = await auth.api.getSession({ headers });
      if (!session) return { error: "Unauthorized" };

      const membership = await prisma.member.findFirst({
        where: {
          organizationId,
          userId: session.user.id,
          role: { in: ["owner", "admin"] },
        },
      });
      if (!membership) {
        return { error: "You do not have permission to modify this organization." };
      }
      return {
        key: `organization-logos/${organizationId}/${Date.now()}.${extension(fileType)}`,
      };
    },
  },
};

export function isUploadRouteName(value: string): value is UploadRouteName {
  return value in uploadRoutes;
}
