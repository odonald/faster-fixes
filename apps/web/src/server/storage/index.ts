import { databaseStorage } from "./database";
import { filesystemStorage } from "./filesystem";
import { STORAGE_PROVIDER } from "./provider";
import { s3Storage } from "./s3";
import type { StorageBackend } from "./types";

export { STORAGE_PROVIDER } from "./provider";
export type { StorageProvider } from "./provider";
export type { StorageBackend } from "./types";

/** The configured storage backend. Callers never touch S3 or Prisma directly. */
export const storage: StorageBackend =
  STORAGE_PROVIDER === "filesystem"
    ? filesystemStorage
    : STORAGE_PROVIDER === "database"
      ? databaseStorage
      : s3Storage;

/** True when /api/assets serves the files (no bucket involved). */
export const STORAGE_SERVED_BY_APP = typeof storage.read === "function";
