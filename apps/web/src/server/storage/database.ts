import { prisma } from "@workspace/db";
import { signAssetPath } from "./asset-url-signing";
import type { StorageBackend } from "./types";

export const DATABASE_BUCKET = "postgres";

function appBaseUrl(): string {
  const base = process.env.BETTER_AUTH_URL ?? process.env.BASE_URL;
  if (!base) throw new Error("BASE_URL is required to build asset URLs");
  return base.replace(/\/$/, "");
}

/**
 * Files stored as bytes in Postgres (`asset_blobs`), served by /api/assets.
 * Suited to the sizes this app handles (screenshots ≤ 5 MB, images ≤ 2 MB);
 * one backup covers everything and no bucket or second domain is needed.
 */
export const databaseStorage: StorageBackend = {
  provider: "database",
  bucket: () => DATABASE_BUCKET,

  async put({ key, body, contentType }) {
    // Copy into a plain ArrayBuffer-backed view: Prisma's Bytes type rejects
    // Node Buffers that may sit on a SharedArrayBuffer.
    const data = new Uint8Array(body);
    await prisma.assetBlob.upsert({
      where: { key },
      create: { key, data, mimeType: contentType, size: data.byteLength },
      update: { data, mimeType: contentType, size: data.byteLength },
    });
  },

  async delete(key) {
    await prisma.assetBlob.deleteMany({ where: { key } });
  },

  async getSignedUrl(key, expiresIn) {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
    const signature = signAssetPath(key, expiresAt);
    const params = new URLSearchParams({ exp: String(expiresAt), sig: signature });
    return `${appBaseUrl()}/api/assets/${encodeKey(key)}?${params}`;
  },

  publicUrl(key) {
    return `${appBaseUrl()}/api/assets/${encodeKey(key)}`;
  },
};

function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}
