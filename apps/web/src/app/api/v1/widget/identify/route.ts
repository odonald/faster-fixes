import { checkRateLimit } from "@/server/api/check-rate-limit";
import { resolveProject } from "@/server/api/resolve-project";
import { issueReviewerSession, REVIEWER_SESSION_TTL_SECONDS } from "@/server/api/reviewer-session";
import { validateOrigin } from "@/server/api/validate-origin";
import { verifyIdentity } from "@/server/api/verify-identity";
import { prisma } from "@workspace/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({ identity: z.string().min(1).max(4096) });

/**
 * POST /api/v1/widget/identify
 *
 * The host app signs "this logged-in user may review" with the project's
 * identity secret; the widget posts that blob here and receives a short-lived
 * reviewer session. Reviewers are keyed by (project, externalId), so the same
 * user always maps to the same reviewer row and their feedback stays
 * attributed to them.
 */
export async function POST(req: NextRequest) {
  const project = await resolveProject(req.headers.get("x-api-key"));
  if (!project) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!validateOrigin(req.headers, project.domain)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }
  if (!project.identitySecret) {
    return NextResponse.json(
      { error: "Identity is not enabled for this project" },
      { status: 403 },
    );
  }

  const { allowed } = await checkRateLimit(project.id, "read");
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 },
    );
  }

  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const verified = verifyIdentity(body.data.identity, project.identitySecret);
  if (!verified.ok) {
    return NextResponse.json(
      { error: `Invalid identity (${verified.reason})` },
      { status: 403 },
    );
  }
  const { identity } = verified;

  const reviewer = await prisma.reviewer.upsert({
    where: { projectId_externalId: { projectId: project.id, externalId: identity.externalId } },
    create: {
      projectId: project.id,
      externalId: identity.externalId,
      name: identity.name,
      email: identity.email,
      role: identity.role,
      source: "identity",
      lastSeenAt: new Date(),
    },
    update: {
      name: identity.name,
      email: identity.email ?? null,
      role: identity.role,
      lastSeenAt: new Date(),
    },
  });

  if (!reviewer.isActive) {
    return NextResponse.json({ error: "Reviewer access revoked" }, { status: 403 });
  }

  return NextResponse.json({
    session: issueReviewerSession(reviewer.id, project.id),
    expiresIn: REVIEWER_SESSION_TTL_SECONDS,
    reviewer: {
      id: reviewer.id,
      name: reviewer.name,
      role: reviewer.role,
      canSeeAll: reviewer.role === "admin",
    },
  });
}
