import type { StorageProvider } from "./provider";

export type PutObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
};

export type StoredObject = {
  data: Uint8Array;
  mimeType: string;
  size: number;
};

export interface StorageBackend {
  provider: StorageProvider;
  /** Logical bucket name recorded on Asset rows. */
  bucket(): string;
  put(input: PutObjectInput): Promise<void>;
  delete(key: string): Promise<void>;
  /** Time-limited URL a browser can open. Absolute. */
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
  /** Stable URL for public assets (avatars, logos). */
  publicUrl(key: string): string;
  /**
   * Present only for providers whose files the app serves itself
   * (filesystem, database); /api/assets uses it. S3-style providers hand out
   * URLs to the bucket instead.
   */
  read?(key: string): Promise<StoredObject | null>;
}
