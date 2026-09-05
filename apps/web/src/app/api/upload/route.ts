import { STORAGE_PROVIDER } from "@/server/storage";
import { bucketName, s3PublicClient } from "@/server/storage/s3";
import { uploadRoutes } from "@/server/upload/routes";
import { RejectUpload, route, type Router } from "@better-upload/server";
import { toRouteHandler } from "@better-upload/server/adapters/next";
import { NextResponse } from "next/server";

/**
 * Presigned-URL uploads for S3-compatible providers. With
 * STORAGE_PROVIDER=database the browser posts the file to /api/upload/direct
 * instead (see useStorageUpload).
 */
function buildRouter(): Router {
  return {
    // Presigned PUT URLs are opened by the browser.
    client: s3PublicClient,
    bucketName: bucketName(),
    routes: Object.fromEntries(
      Object.entries(uploadRoutes).map(([name, definition]) => [
        name,
        route({
          fileTypes: definition.fileTypes,
          maxFileSize: definition.maxFileSize,
          onBeforeUpload: async ({ req, file, clientMetadata }) => {
            const result = await definition.authorize({
              headers: req.headers,
              fileType: file.type,
              metadata: (clientMetadata ?? {}) as Record<string, unknown>,
            });
            if ("error" in result) throw new RejectUpload(result.error);
            return { objectInfo: { key: result.key } };
          },
        }),
      ]),
    ),
  };
}

let handler: ReturnType<typeof toRouteHandler> | null = null;

export async function POST(req: Request) {
  if (STORAGE_PROVIDER === "database") {
    return NextResponse.json(
      { error: "Presigned uploads are disabled; use /api/upload/direct" },
      { status: 400 },
    );
  }
  handler ??= toRouteHandler(buildRouter());
  return handler.POST(req);
}
