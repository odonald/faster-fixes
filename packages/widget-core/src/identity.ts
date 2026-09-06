/**
 * Server-side helper for host apps: sign "this logged-in user may review" so
 * the widget can identify them without a share link.
 *
 * Runs anywhere WebCrypto exists (Node 20+, edge runtimes, Deno, Bun). Call it
 * on your backend only – the secret must never reach the browser.
 *
 * @example
 *   const identity = await signIdentity(process.env.FASTERFIXES_IDENTITY_SECRET!, {
 *     externalId: user.id,
 *     name: user.name,
 *     role: user.isAdmin ? "admin" : "reviewer",
 *   });
 *   // pass `identity` to <FeedbackProvider identity={identity} />
 */
export type ReviewerRole = "reviewer" | "admin";

export type ReviewerIdentity = {
  /** Stable id of the user in your system (Auth0 sub, Supabase user id, ...). */
  externalId: string;
  /** Display name shown in the FasterFixes inbox. */
  name: string;
  /** Optional; shown in the reviewers list. Leave out to avoid storing emails. */
  email?: string;
  /** "admin" may see every marker in the widget; "reviewer" (default) only their own. */
  role?: ReviewerRole;
};

export type SignIdentityOptions = {
  /** Lifetime of the signed blob in seconds. Default 1 hour. */
  ttlSeconds?: number;
  /** Override the clock (tests). Unix milliseconds. */
  now?: number;
};

export async function signIdentity(
  secret: string,
  identity: ReviewerIdentity,
  options: SignIdentityOptions = {},
): Promise<string> {
  if (!secret) throw new Error("signIdentity: secret is required");
  if (!identity.externalId) throw new Error("signIdentity: externalId is required");
  if (!identity.name) throw new Error("signIdentity: name is required");

  const now = options.now ?? Date.now();
  const payload = {
    externalId: identity.externalId,
    name: identity.name,
    ...(identity.email ? { email: identity.email } : {}),
    role: identity.role ?? "reviewer",
    exp: Math.floor(now / 1000) + (options.ttlSeconds ?? 3600),
  };

  const segment = base64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(segment));
  return `${segment}.${base64url(new Uint8Array(signature))}`;
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Dependency-free base64url (no padding) so this runs in browsers, Node and edge alike. */
function base64url(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    const triple = (a << 16) | (b << 8) | c;
    out += B64[(triple >> 18) & 63]! + B64[(triple >> 12) & 63]!;
    out += i + 1 < bytes.length ? B64[(triple >> 6) & 63]! : "";
    out += i + 2 < bytes.length ? B64[triple & 63]! : "";
  }
  return out;
}
