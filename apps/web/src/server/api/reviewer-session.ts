import crypto from "crypto";

/**
 * Stateless, short-lived session handed to the widget after a successful
 * identity handshake. Sent in the same X-Reviewer-Token header as share-link
 * tokens; distinguished by the `ffs_` prefix.
 *
 *   ffs_<base64url(json)>.<base64url(hmac)>
 */
const PREFIX = "ffs_";
export const REVIEWER_SESSION_TTL_SECONDS = 12 * 60 * 60;

type SessionPayload = { r: string; p: string; exp: number };

function secret(): string {
  const value = process.env.REVIEWER_SESSION_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!value) throw new Error("BETTER_AUTH_SECRET is required to sign reviewer sessions");
  return value;
}

function sign(segment: string): string {
  return crypto.createHmac("sha256", secret()).update(segment).digest("base64url");
}

export function issueReviewerSession(reviewerId: string, projectId: string): string {
  const payload: SessionPayload = {
    r: reviewerId,
    p: projectId,
    exp: Math.floor(Date.now() / 1000) + REVIEWER_SESSION_TTL_SECONDS,
  };
  const segment = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${PREFIX}${segment}.${sign(segment)}`;
}

export function isReviewerSession(token: string): boolean {
  return token.startsWith(PREFIX);
}

/** Returns the reviewer id when the session is valid for this project, else null. */
export function verifyReviewerSession(token: string, projectId: string): string | null {
  if (!isReviewerSession(token)) return null;
  const [segment, signature] = token.slice(PREFIX.length).split(".");
  if (!segment || !signature) return null;

  const expected = Buffer.from(sign(segment));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(segment, "base64url").toString()) as SessionPayload;
    if (payload.p !== projectId) return null;
    if (!Number.isFinite(payload.exp) || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.r;
  } catch {
    return null;
  }
}
