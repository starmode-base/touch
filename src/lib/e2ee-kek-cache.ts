import { base64urlEncode } from "./e2ee";
import { z } from "zod";

const CryptoSession = z.object({
  kek: z.string(), // base64url-encoded
  credentialId: z.string(),
});

type CryptoSession = z.infer<typeof CryptoSession>;

const STORAGE_KEY = "crypto_session";

/**
 * Get the crypto session from sessionStorage
 */
export function getCryptoSession(): CryptoSession | null {
  const cached = sessionStorage.getItem(STORAGE_KEY);
  if (!cached) return null;

  return CryptoSession.parse(JSON.parse(cached));
}

/**
 * Check if a crypto session exists in sessionStorage
 */
export function hasCryptoSession(): boolean {
  return getCryptoSession() !== null;
}

/**
 * Store a crypto session in sessionStorage
 */
export function setCryptoSession(kek: Uint8Array, credentialId: string) {
  const cached: CryptoSession = {
    kek: base64urlEncode(kek),
    credentialId,
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
}

/**
 * Clear the crypto session from sessionStorage
 */
export function clearCryptoSession() {
  sessionStorage.removeItem(STORAGE_KEY);
}
