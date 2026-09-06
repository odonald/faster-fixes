import { mkdir, readFile, rename, rm, stat, writeFile } from "fs/promises";
import path from "path";
import {
  appServedPublicUrl,
  appServedSignedUrl,
  mimeTypeFromKey,
} from "./app-served";
import type { StorageBackend } from "./types";

export const FILESYSTEM_BUCKET = "filesystem";

/**
 * Files on local disk under STORAGE_DIR (default ./data/uploads, /data/uploads
 * in the Docker image). Mount that directory as a persistent volume.
 *
 * Keys are S3-style paths ("feedback-screenshots/<project>/<uuid>.png"); they
 * are resolved inside STORAGE_DIR and anything escaping it is rejected.
 */
export function storageDir(): string {
  return path.resolve(process.env.STORAGE_DIR || path.join(process.cwd(), "data", "uploads"));
}

function resolveKey(key: string): string {
  const root = storageDir();
  const target = path.resolve(root, key);
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error(`[storage] refusing key outside STORAGE_DIR: ${key}`);
  }
  return target;
}

export const filesystemStorage: StorageBackend = {
  provider: "filesystem",
  bucket: () => FILESYSTEM_BUCKET,

  async put({ key, body }) {
    const target = resolveKey(key);
    await mkdir(path.dirname(target), { recursive: true });
    // Write to a sibling temp file and rename so readers never see a partial file.
    const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, body);
    await rename(tmp, target);
  },

  async delete(key) {
    await rm(resolveKey(key), { force: true });
  },

  getSignedUrl: appServedSignedUrl,
  publicUrl: appServedPublicUrl,

  async read(key) {
    const target = resolveKey(key);
    try {
      const [data, info] = await Promise.all([readFile(target), stat(target)]);
      return { data, mimeType: mimeTypeFromKey(key), size: info.size };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  },
};
