/**
 * Storage provider selection. Kept dependency-free so client components can
 * import `STORAGE_PROVIDER`-derived constants indirectly via NEXT_PUBLIC_*.
 *
 * - `database` – file bytes live in Postgres (`asset_blobs`), served by
 *                /api/assets. Zero extra infrastructure; the default for
 *                self-hosting.
 * - `s3`       – any S3-compatible endpoint (MinIO, Garage, Hetzner, ...).
 * - `aws`      – AWS S3.
 * - `r2`       – Cloudflare R2.
 */
export type StorageProvider = "database" | "s3" | "aws" | "r2";

export function resolveStorageProvider(): StorageProvider {
  const raw = (process.env.STORAGE_PROVIDER ?? "").toLowerCase();
  if (raw === "database" || raw === "db" || raw === "postgres") return "database";
  if (raw === "s3" || raw === "minio" || raw === "custom") return "s3";
  if (raw === "aws") return "aws";
  if (raw === "r2" || raw === "cloudflare") return "r2";
  // Backwards compatibility with upstream configs that only set R2 creds.
  if (!raw && process.env.R2_ACCOUNT_ID) return "r2";
  if (!raw && process.env.STORAGE_ENDPOINT) return "s3";
  return "database";
}

export const STORAGE_PROVIDER: StorageProvider = resolveStorageProvider();
