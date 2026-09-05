import { storage } from "@/server/storage";
import { prisma } from "@workspace/db";

/**
 * Deletes an Asset: removes the stored object (best-effort) then deletes the
 * DB record. Safe to call even if the object is already gone.
 */
export async function deleteAsset(assetId: string) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { id: true, key: true, bucket: true },
  });

  if (!asset) return;

  try {
    await storage.delete(asset.key);
  } catch (error) {
    console.error(`Failed to delete stored object (key=${asset.key}):`, error);
  }

  await prisma.asset.delete({ where: { id: asset.id } });
}
