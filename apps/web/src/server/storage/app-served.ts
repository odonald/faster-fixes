import { signAssetPath } from "./asset-url-signing";

/**
 * URL helpers shared by the providers whose files are served by the app
 * itself (filesystem, database) via /api/assets/[...key].
 */
export function appBaseUrl(): string {
  const base = process.env.BETTER_AUTH_URL ?? process.env.BASE_URL;
  if (!base) throw new Error("BASE_URL is required to build asset URLs");
  return base.replace(/\/$/, "");
}

export function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

export async function appServedSignedUrl(
  key: string,
  expiresIn: number,
): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  const params = new URLSearchParams({
    exp: String(expiresAt),
    sig: signAssetPath(key, expiresAt),
  });
  return `${appBaseUrl()}/api/assets/${encodeKey(key)}?${params}`;
}

export function appServedPublicUrl(key: string): string {
  return `${appBaseUrl()}/api/assets/${encodeKey(key)}`;
}

const MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};

export function mimeTypeFromKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[ext] ?? "application/octet-stream";
}
