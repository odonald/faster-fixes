import { aws, cloudflare, custom } from "@better-upload/server/clients";
import {
  deleteObject,
  presignGetObject,
  putObject,
} from "@better-upload/server/helpers";
import { STORAGE_PROVIDER } from "./provider";
import type { StorageBackend } from "./types";

type Client = ReturnType<typeof custom>;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[storage] ${name} is required for STORAGE_PROVIDER=${STORAGE_PROVIDER}`,
    );
  }
  return value;
}

/**
 * Two endpoints for the `s3` provider:
 * - `STORAGE_ENDPOINT`        – what the server talks to (docker-internal is fine).
 * - `STORAGE_PUBLIC_ENDPOINT` – what browsers open via presigned URLs.
 *                               Defaults to STORAGE_ENDPOINT.
 */
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
    default: {
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
  // Constructed on first use so importing this module (e.g. during
  // `next build`) never throws on missing credentials.
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

export function bucketName(): string {
  return required("STORAGE_BUCKET_NAME");
}

export const s3Storage: StorageBackend = {
  provider: STORAGE_PROVIDER,
  bucket: () => bucketName(),

  async put({ key, body, contentType }) {
    await putObject(s3Client, {
      bucket: bucketName(),
      key,
      body: new Uint8Array(body),
      contentType,
    });
  },

  async delete(key) {
    await deleteObject(s3Client, { bucket: bucketName(), key });
  },

  async getSignedUrl(key, expiresIn) {
    return presignGetObject(s3PublicClient, {
      bucket: bucketName(),
      key,
      expiresIn,
    });
  },

  publicUrl(key) {
    const base = process.env.NEXT_PUBLIC_STORAGE_BASE_URL;
    if (!base) {
      throw new Error(
        "NEXT_PUBLIC_STORAGE_BASE_URL is required to build public asset URLs",
      );
    }
    return `${base.replace(/\/$/, "")}/${key}`;
  },
};
