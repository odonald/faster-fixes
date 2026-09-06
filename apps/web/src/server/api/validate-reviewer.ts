import { prisma } from "@workspace/db";
import crypto from "crypto";
import { isReviewerSession, verifyReviewerSession } from "./reviewer-session";

/**
 * Resolves the X-Reviewer-Token header to an active reviewer of the project.
 *
 * Two kinds of credential arrive here:
 * - share-link tokens (`ff_token` from a reviewer URL), stored as SHA-256 hashes
 * - identity sessions (`ffs_…`) issued by /api/v1/widget/identify
 *
 * Returns the reviewer record or null if invalid/inactive.
 */
export async function validateReviewer(token: string | null, projectId: string) {
  if (!token) return null;

  if (isReviewerSession(token)) {
    const reviewerId = verifyReviewerSession(token, projectId);
    if (!reviewerId) return null;
    return prisma.reviewer.findFirst({
      where: { id: reviewerId, projectId, isActive: true },
    });
  }

  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const reviewer = await prisma.reviewer.findFirst({
    where: { token: hash, projectId, isActive: true },
  });
  if (reviewer) return reviewer;

  // Fallback: plaintext lookup for tokens not yet migrated — remove after data migration
  return prisma.reviewer.findFirst({
    where: { token, projectId, isActive: true },
  });
}

export type ValidatedReviewer = NonNullable<Awaited<ReturnType<typeof validateReviewer>>>;

/**
 * Who may see whose markers. Admins see everything. Identity reviewers see only
 * their own (they are ordinary users of the host app who also test). Share-link
 * reviewers keep the original behaviour and see the whole project, since a
 * client's reviewers collaborate on the same pins.
 */
export function reviewerCanSeeAll(reviewer: ValidatedReviewer): boolean {
  return reviewer.role === "admin" || reviewer.source === "link";
}
