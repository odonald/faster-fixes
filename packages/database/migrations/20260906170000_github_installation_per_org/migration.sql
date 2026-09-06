-- A GitHub App installation (one per GitHub account or GitHub organisation) can
-- now be connected to several organisations of this instance.
DROP INDEX IF EXISTS "github_installation_installationId_key";
CREATE UNIQUE INDEX "github_installation_organizationId_installationId_key"
  ON "github_installation"("organizationId", "installationId");
CREATE INDEX "github_installation_installationId_idx" ON "github_installation"("installationId");
