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
