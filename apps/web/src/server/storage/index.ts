import { aws, cloudflare, custom } from "@better-upload/server/clients";

type Client = ReturnType<typeof custom>;

/**
 * Object storage is provider-agnostic. Pick one with `STORAGE_PROVIDER`:
 *
 * - `s3`    – any S3-compatible endpoint (MinIO, Garage, SeaweedFS, Hetzner,
 *             Scaleway, ...). Configure `STORAGE_ENDPOINT`, `STORAGE_REGION`,
 *             `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`. This is the
 *             default for self-hosted installs (docker-compose ships MinIO).
 * - `aws`   – AWS S3 proper. Configure `STORAGE_REGION`,
 *             `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`.
 * - `r2`    – Cloudflare R2. Configure `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
 *             `R2_SECRET_ACCESS_KEY`.
 *
 * `STORAGE_BUCKET_NAME` is required for every provider.
 *
 * Two endpoints for the `s3` provider:
 * - `STORAGE_ENDPOINT`        – what the server talks to (docker-internal is fine,
 *                               e.g. http://minio:9000).
 * - `STORAGE_PUBLIC_ENDPOINT` – what browsers open via presigned URLs (screenshot
 *                               reads, dashboard uploads). Defaults to
 *                               STORAGE_ENDPOINT; set it when they differ.
 */
export type StorageProvider = "s3" | "aws" | "r2";

function resolveProvider(): StorageProvider {
  const raw = (process.env.STORAGE_PROVIDER ?? "").toLowerCase();
  if (raw === "s3" || raw === "minio" || raw === "custom") return "s3";
  if (raw === "aws") return "aws";
  if (raw === "r2" || raw === "cloudflare") return "r2";
  // Backwards compatibility: R2 credentials present and no explicit provider.
  if (!raw && process.env.R2_ACCOUNT_ID) return "r2";
  return "s3";
}

export const STORAGE_PROVIDER: StorageProvider = resolveProvider();
export const STORAGE_BUCKET = process.env.STORAGE_BUCKET_NAME ?? "";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[storage] ${name} is required for STORAGE_PROVIDER=${STORAGE_PROVIDER}`,
    );
  }
  return value;
}

function createClient(scope: "internal" | "public"): Client {
  switch (STORAGE_PROVIDER) {
    case "r2":
      return cloudflare({
        accountId: required("R2_ACCOUNT_ID"),
        accessKeyId: required("R2_ACCESS_KEY_ID"),
        secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
      });
    case "aws":
      return aws({
        region: process.env.STORAGE_REGION || "us-east-1",
        accessKeyId: required("STORAGE_ACCESS_KEY_ID"),
        secretAccessKey: required("STORAGE_SECRET_ACCESS_KEY"),
      });
    case "s3": {
      const endpoint = new URL(
        scope === "public"
          ? process.env.STORAGE_PUBLIC_ENDPOINT || required("STORAGE_ENDPOINT")
          : required("STORAGE_ENDPOINT"),
      );
      return custom({
        host: endpoint.host,
        secure: endpoint.protocol !== "http:",
        region: process.env.STORAGE_REGION || "us-east-1",
        accessKeyId: required("STORAGE_ACCESS_KEY_ID"),
        secretAccessKey: required("STORAGE_SECRET_ACCESS_KEY"),
        // MinIO and most self-hosted S3 servers need path-style addressing.
        forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE !== "false",
      });
    }
  }
}

function lazyClient(scope: "internal" | "public"): Client {
  let cached: Client | null = null;
  // Lazily constructed so importing this module (e.g. during `next build`)
  // never throws on missing credentials – only the first storage call does.
  return new Proxy({} as Client, {
    get(_target, prop, receiver) {
      if (!cached) cached = createClient(scope);
      return Reflect.get(cached, prop, receiver);
    },
  });
}

/** Server-side operations: putObject, deleteObject. */
export const s3Client: Client = lazyClient("internal");

/** Anything that produces URLs a browser will open: presigned GET/PUT. */
export const s3PublicClient: Client = lazyClient("public");
