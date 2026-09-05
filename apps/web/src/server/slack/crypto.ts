import {
  decryptWithKey,
  encryptWithKey,
  loadHexKeyFromEnv,
} from "@/utils/crypto/aes-gcm";

// Resolved on first use so the module can be imported (and the app built)
// without the Slack integration configured.
let key: Buffer | null = null;
const getKey = () => (key ??= loadHexKeyFromEnv("SLACK_TOKEN_ENCRYPTION_KEY"));

export function encryptSlackToken(plain: string): string {
  return encryptWithKey(plain, getKey());
}

export function decryptSlackToken(payload: string): string {
  return decryptWithKey(payload, getKey());
}
