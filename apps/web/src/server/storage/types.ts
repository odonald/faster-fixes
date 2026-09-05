import type { StorageProvider } from "./provider";

export type PutObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
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
}
