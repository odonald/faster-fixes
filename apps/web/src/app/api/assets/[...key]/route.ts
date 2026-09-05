import {
  isPublicAssetKey,
  verifyAssetSignature,
} from "@/server/storage/asset-url-signing";
import { prisma } from "@workspace/db";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ key: string[] }> };

/**
 * Serves files stored in Postgres (STORAGE_PROVIDER=database).
 *
 * - avatars and logos are public (same as a public bucket)
 * - everything else (screenshots) needs the `exp` + `sig` query params minted
 *   by `storage.getSignedUrl`, mirroring an S3 presigned GET.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { key: segments } = await params;
  const key = segments.map(decodeURIComponent).join("/");

  if (!isPublicAssetKey(key)) {
    const exp = Number(req.nextUrl.searchParams.get("exp"));
    const sig = req.nextUrl.searchParams.get("sig") ?? "";
    if (!verifyAssetSignature(key, exp, sig)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const blob = await prisma.assetBlob.findUnique({ where: { key } });
  if (!blob) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(blob.data), {
    headers: {
      "Content-Type": blob.mimeType,
      "Content-Length": String(blob.size),
      // Keys are unique per upload (timestamp / uuid), so long caching is safe.
      "Cache-Control": isPublicAssetKey(key)
        ? "public, max-age=31536000, immutable"
        : "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
