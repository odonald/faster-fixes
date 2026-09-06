import { prisma } from "@workspace/db";
import { appServedPublicUrl, appServedSignedUrl } from "./app-served";
import type { StorageBackend } from "./types";

export const DATABASE_BUCKET = "postgres";

/**
 * Files stored as bytes in Postgres (`asset_blobs`), served by /api/assets.
 * Zero extra infrastructure and a single backup, at the cost of database size.
 * Suited to this app's limits (screenshots ≤ 5 MB, images ≤ 2 MB).
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

  getSignedUrl: appServedSignedUrl,
  publicUrl: appServedPublicUrl,

  async read(key) {
    const blob = await prisma.assetBlob.findUnique({ where: { key } });
    if (!blob) return null;
    return { data: blob.data, mimeType: blob.mimeType, size: blob.size };
  },
};
