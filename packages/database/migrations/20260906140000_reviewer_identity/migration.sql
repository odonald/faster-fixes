-- Reviewers identified by the host app (signed identity) next to share-link reviewers.
ALTER TABLE "reviewer" ALTER COLUMN "token" DROP NOT NULL;
ALTER TABLE "reviewer"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'link',
  ADD COLUMN "role" TEXT NOT NULL DEFAULT 'reviewer',
  ADD COLUMN "externalId" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "lastSeenAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "reviewer_projectId_externalId_key" ON "reviewer"("projectId", "externalId");

-- Per-project shared secret for signing identities.
ALTER TABLE "project" ADD COLUMN "identitySecret" TEXT;
