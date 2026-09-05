import { presignGetObject } from "@better-upload/server/helpers";
import { s3PublicClient } from "@/server/storage";

type AssetForSignedUrl = {
  key: string;
  bucket: string;
};

export async function getSignedAssetUrl(
  asset: AssetForSignedUrl,
  expiresIn = 3600,
): Promise<string> {
  return presignGetObject(s3PublicClient, {
    bucket: asset.bucket,
    key: asset.key,
    expiresIn,
  });
}
