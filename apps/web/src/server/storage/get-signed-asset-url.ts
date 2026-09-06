import { storage } from "@/server/storage";

type AssetForSignedUrl = {
  key: string;
  bucket: string;
};

export async function getSignedAssetUrl(
  asset: AssetForSignedUrl,
  expiresIn = 3600,
): Promise<string> {
  return storage.getSignedUrl(asset.key, expiresIn);
}

const ONE_YEAR = 365 * 24 * 3600;
/** SigV4 presigned URLs cannot outlive seven days. */
const S3_MAX = 7 * 24 * 3600;

/**
 * A screenshot URL for an issue tracker (GitHub, Linear, Jira). Issue bodies
 * are read for months, so the default one-hour TTL leaves a broken image
 * behind almost immediately. App-served providers sign for a year; S3-style
 * providers get the longest their signature scheme allows.
 */
export async function getTrackerScreenshotUrl(
  asset: AssetForSignedUrl,
): Promise<string> {
  const appServed =
    storage.provider === "filesystem" || storage.provider === "database";
  return storage.getSignedUrl(asset.key, appServed ? ONE_YEAR : S3_MAX);
}
