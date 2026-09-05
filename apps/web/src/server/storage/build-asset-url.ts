type AssetForUrl = {
  key: string;
  provider: string;
  bucket: string;
};

/**
 * Constructs the public URL for an asset from its storage metadata.
 * `NEXT_PUBLIC_STORAGE_BASE_URL` is the public base of the bucket
 * (R2 public bucket URL, MinIO `https://s3.example.com/bucket`, ...).
 */
export function buildAssetUrl(asset: AssetForUrl): string {
  const base = process.env.NEXT_PUBLIC_STORAGE_BASE_URL;
  if (base) return `${base.replace(/\/$/, "")}/${asset.key}`;

  if (asset.provider === "aws" || asset.provider === "s3") {
    const region = process.env.STORAGE_REGION || "us-east-1";
    return `https://${asset.bucket}.s3.${region}.amazonaws.com/${asset.key}`;
  }

  throw new Error(
    `Cannot build asset URL for provider "${asset.provider}" without NEXT_PUBLIC_STORAGE_BASE_URL`,
  );
}
