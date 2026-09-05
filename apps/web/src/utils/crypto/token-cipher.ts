import {
  decryptWithKey,
  encryptWithKey,
  loadHexKeyFromEnv,
} from "@/utils/crypto/aes-gcm";

export type TokenCipher = {
  encrypt: (plain: string) => string;
  decrypt: (payload: string) => string;
};

// Binds the AES-256-GCM primitive to a hex key loaded from the named env var, so
// each Tracker integration (Linear, Jira, …) gets encrypt/decrypt bound to its
// own key without re-loading or re-validating the key itself. See ADR 0003.
export function createTokenCipher(envVarName: string): TokenCipher {
  // Resolved on first use, not at import: integrations are optional on
  // self-hosted installs and `next build` evaluates these modules while
  // collecting page data.
  let key: Buffer | null = null;
  const getKey = () => (key ??= loadHexKeyFromEnv(envVarName));
  return {
    encrypt: (plain) => encryptWithKey(plain, getKey()),
    decrypt: (payload) => decryptWithKey(payload, getKey()),
  };
}
