import crypto from "crypto";
import { z } from "zod";

/**
 * Identity blobs are produced by the host app's backend with `signIdentity`
 * from @fasterfixes/core: base64url(json) + "." + base64url(HMAC-SHA256 over
 * the json segment, keyed with the project's identity secret).
 */
export const IdentityPayloadSchema = z.object({
  externalId: z.string().min(1).max(200),
  name: z.string().min(1).max(120),
  email: z.string().email().max(320).optional(),
  role: z.enum(["reviewer", "admin"]).default("reviewer"),
  /** Unix seconds. */
  exp: z.number().int(),
});

export type IdentityPayload = z.infer<typeof IdentityPayloadSchema>;

export type VerifyIdentityResult =
  | { ok: true; identity: IdentityPayload }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" | "invalid_payload" };

export function verifyIdentity(blob: string, secret: string): VerifyIdentityResult {
  const [segment, signature] = blob.split(".");
  if (!segment || !signature) return { ok: false, reason: "malformed" };

  const expected = Buffer.from(
    crypto.createHmac("sha256", secret).update(segment).digest("base64url"),
  );
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    return { ok: false, reason: "bad_signature" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(segment, "base64url").toString());
  } catch {
    return { ok: false, reason: "malformed" };
  }

  const result = IdentityPayloadSchema.safeParse(parsed);
  if (!result.success) return { ok: false, reason: "invalid_payload" };
  if (result.data.exp < Math.floor(Date.now() / 1000)) return { ok: false, reason: "expired" };

  return { ok: true, identity: result.data };
}

export function generateIdentitySecret(): string {
  return `ffid_${crypto.randomBytes(32).toString("base64url")}`;
}
