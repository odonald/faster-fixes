import { storage } from "@/server/storage";
import { createAsset } from "@/server/storage/create-asset";
import { isUploadRouteName, uploadRoutes } from "@/server/upload/routes";
import { NextRequest, NextResponse } from "next/server";

/**
 * Direct multipart upload for the dashboard (avatars, logos). Used when files
 * live in Postgres; the file passes through the app instead of going to a
 * bucket via presigned URL.
 *
 * Form fields: `route` (upload route name), `file`, optional `metadata` (JSON).
 */
export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const routeName = formData.get("route");
  if (typeof routeName !== "string" || !isUploadRouteName(routeName)) {
    return NextResponse.json({ error: "Unknown upload route" }, { status: 400 });
  }
  const definition = uploadRoutes[routeName];

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!definition.fileTypes.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (file.size > definition.maxFileSize) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  let metadata: Record<string, unknown> = {};
  const rawMetadata = formData.get("metadata");
  if (typeof rawMetadata === "string" && rawMetadata) {
    try {
      metadata = JSON.parse(rawMetadata) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid metadata" }, { status: 400 });
    }
  }

  const authorized = await definition.authorize({
    headers: req.headers,
    fileType: file.type,
    metadata,
  });
  if ("error" in authorized) {
    const status = authorized.error === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: authorized.error }, { status });
  }

  const body = Buffer.from(await file.arrayBuffer());
  await storage.put({ key: authorized.key, body, contentType: file.type });
  await createAsset({
    key: authorized.key,
    bucket: storage.bucket(),
    provider: storage.provider,
    filename: file.name,
    mimeType: file.type,
    size: body.length,
  });

  return NextResponse.json({ key: authorized.key });
}
