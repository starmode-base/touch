import { base64urlEncode } from "./e2ee";

interface CachedKek {
  kek: string; // base64url-encoded
  credentialId: string;
}

const KEK_STORAGE_KEY = "e2ee_kek";

/**
 * Get the cached KEK from sessionStorage
 */
export function getCachedKek() {
  const cached = sessionStorage.getItem(KEK_STORAGE_KEY);
  if (!cached) return null;

  return JSON.parse(cached) as CachedKek;
}

/**
 * Check if a cached KEK exists
 */
export function hasCachedKek() {
  return getCachedKek() !== null;
}

/**
 * Get the credential ID of the cached KEK
 */
export function getCachedCredentialId(): string | null {
  const cached = getCachedKek();
  return cached?.credentialId ?? null;
}

/**
 * Store a cached KEK in sessionStorage
 */
export function storeCachedKek(kek: Uint8Array, credentialId: string) {
  const cached: CachedKek = {
    kek: base64urlEncode(kek),
    credentialId,
  };
  sessionStorage.setItem(KEK_STORAGE_KEY, JSON.stringify(cached));
}

/**
 * Clear the cached KEK from sessionStorage
 */
export function clearCachedKek() {
  sessionStorage.removeItem(KEK_STORAGE_KEY);
}
