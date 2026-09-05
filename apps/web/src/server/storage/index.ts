import { databaseStorage } from "./database";
import { STORAGE_PROVIDER } from "./provider";
import { s3Storage } from "./s3";
import type { StorageBackend } from "./types";

export { STORAGE_PROVIDER } from "./provider";
export type { StorageProvider } from "./provider";
export type { StorageBackend } from "./types";

/** The configured storage backend. Callers never touch S3 or Prisma directly. */
export const storage: StorageBackend =
  STORAGE_PROVIDER === "database" ? databaseStorage : s3Storage;
