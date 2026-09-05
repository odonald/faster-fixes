import crypto from "crypto";

/**
 * HMAC-signed, expiring URLs for /api/assets when files live in Postgres.
 * Same contract as an S3 presigned GET: whoever has the URL can read the
 * object until it expires.
 */
function secret(): string {
  const value = process.env.ASSET_URL_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!value) throw new Error("BETTER_AUTH_SECRET is required to sign asset URLs");
  return value;
}

export function signAssetPath(key: string, expiresAtSeconds: number): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`${key}\n${expiresAtSeconds}`)
    .digest("base64url");
}

export function verifyAssetSignature(
  key: string,
  expiresAtSeconds: number,
  signature: string,
): boolean {
  if (!Number.isFinite(expiresAtSeconds)) return false;
  if (expiresAtSeconds < Math.floor(Date.now() / 1000)) return false;
  const expected = signAssetPath(key, expiresAtSeconds);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Key prefixes that are readable without a signature. */
const PUBLIC_PREFIXES = ["user-avatars/", "organization-logos/"];

export function isPublicAssetKey(key: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => key.startsWith(prefix));
}
