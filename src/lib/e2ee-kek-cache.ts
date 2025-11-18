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
function get(): CryptoSession | null {
  const cached = sessionStorage.getItem(STORAGE_KEY);
  if (!cached) return null;

  return CryptoSession.parse(JSON.parse(cached));
}

/**
 * Check if a crypto session exists in sessionStorage
 */
function exists(): boolean {
  return !!get();
}

/**
 * Store a crypto session in sessionStorage
 */
function set(kek: Uint8Array, credentialId: string): void {
  const cached: CryptoSession = {
    kek: base64urlEncode(kek),
    credentialId,
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
}

/**
 * Clear the crypto session from sessionStorage
 */
function clear(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export const cryptoSession = {
  get,
  exists,
  set,
  clear,
};
