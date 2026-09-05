import { storage } from "@/server/storage";

type AssetForUrl = {
  key: string;
  provider: string;
  bucket: string;
};

/** Stable public URL for an asset (avatars, logos). */
export function buildAssetUrl(asset: AssetForUrl): string {
  return storage.publicUrl(asset.key);
}
