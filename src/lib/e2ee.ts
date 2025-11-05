/**
 * Documentation:
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/WebAuthn_extensions#prf
 * https://w3c.github.io/webauthn/#prf-extension
 */

/**
 * Type alias for Uint8Array backed by ArrayBuffer (not SharedArrayBuffer)
 * Required for Web Crypto API compatibility
 */
export type CryptoBytes = Uint8Array<ArrayBuffer>;

/**
 * Base64url encoding utilities
 */
export function base64urlEncode(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64urlDecode(base64url: string) {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function requireBrowser(message: string) {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    throw new Error(message);
  }
}

function generateRandomBytes(byteLength: number) {
  return crypto.getRandomValues(new Uint8Array(byteLength));
}

function generateKekSalt() {
  return generateRandomBytes(32);
}

function generateNonce() {
  return generateRandomBytes(12);
}

function generateChallenge() {
  return generateRandomBytes(32);
}

function generateUserId() {
  return generateRandomBytes(32);
}

/**
 * Generate a random 32-byte DEK (Data Encryption Key)
 */
export function generateDek() {
  return generateRandomBytes(32);
}

async function sha256(data: CryptoBytes) {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

async function hkdfExtractAndExpand(
  ikm: CryptoBytes,
  salt: CryptoBytes,
  info: CryptoBytes,
  lengthBits: number,
) {
  const baseKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info,
    },
    baseKey,
    lengthBits,
  );
  return new Uint8Array(bits);
}

/**
 * Generate constant PRF input for all passkeys
 *
 * This input is constant for a given RP ID, allowing single-prompt authentication.
 * Per-passkey KEK differentiation happens via unique kekSalt values in HKDF.
 */
async function getPrfInput(rpId: string) {
  if (!rpId) {
    throw new Error("rpId is required for PRF context binding");
  }

  const prfLabelBytes = new TextEncoder().encode(`${rpId}::kek::v1`);
  return await sha256(prfLabelBytes);
}

/**
 * Derive a KEK from PRF output using HKDF-SHA256
 *
 * Takes pre-computed PRF output (from WebAuthn) and derives a KEK using the
 * per-passkey salt. This allows single-prompt authentication while maintaining
 * unique KEKs per passkey.
 */
async function deriveKekFromPrfOutput(
  prfOutput: CryptoBytes,
  kekSalt: CryptoBytes,
  hkdfInfo = "kek-v1",
) {
  if (prfOutput.byteLength !== 32) {
    throw new Error("PRF output must be 32 bytes");
  }

  if (kekSalt.byteLength < 16) {
    throw new Error("kekSalt must be at least 16 bytes");
  }

  const infoBytes = new TextEncoder().encode(hkdfInfo);
  return await hkdfExtractAndExpand(prfOutput, kekSalt, infoBytes, 256);
}

/**
 * Wrap (encrypt) a DEK using a KEK with AES-GCM
 *
 * Returns base64url-encoded wrapped DEK (includes nonce + ciphertext + auth tag)
 */
async function wrapDekWithKek(dek: CryptoBytes, kek: CryptoBytes) {
  if (dek.byteLength !== 32) {
    throw new Error("dek must be 32 bytes");
  }

  if (kek.byteLength !== 32) {
    throw new Error("kek must be 32 bytes");
  }

  // Generate random 12-byte nonce for AES-GCM
  const nonce = generateNonce();

  // Import KEK for AES-GCM
  const kekKey = await crypto.subtle.importKey(
    "raw",
    kek,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  // Encrypt DEK with KEK
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    kekKey,
    dek,
  );

  // Concatenate nonce + ciphertext for storage
  const wrapped = new Uint8Array(nonce.byteLength + ciphertext.byteLength);
  wrapped.set(nonce, 0);
  wrapped.set(new Uint8Array(ciphertext), nonce.byteLength);

  return base64urlEncode(wrapped);
}

/**
 * Unwrap (decrypt) a DEK using a KEK with AES-GCM
 *
 * Takes base64url-encoded wrapped DEK and returns the raw DEK bytes
 */
async function unwrapDekWithKek(wrappedDekBase64url: string, kek: CryptoBytes) {
  if (kek.byteLength !== 32) {
    throw new Error("kek must be 32 bytes");
  }

  // Decode wrapped DEK
  const wrapped = base64urlDecode(wrappedDekBase64url);

  // Extract nonce (first 12 bytes) and ciphertext (rest)
  const nonce = wrapped.slice(0, 12);
  const ciphertext = wrapped.slice(12);

  // Import KEK for AES-GCM
  const kekKey = await crypto.subtle.importKey(
    "raw",
    kek,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  // Decrypt ciphertext to get DEK
  const dekBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: nonce },
    kekKey,
    ciphertext,
  );

  return new Uint8Array(dekBuffer);
}

/**
 * Passkey with wrapped DEK from server
 */
export interface StoredPasskey {
  credentialId: string;
  wrappedDek: string;
  kekSalt: string;
  transports: string[];
}

interface CachedKek {
  kek: string; // base64url-encoded
  credentialId: string;
}

const KEK_STORAGE_KEY = "e2ee_kek";

/**
 * Get the cached KEK from sessionStorage
 */
function getCachedKek() {
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

/**
 * Attempt to auto-unlock the DEK using cached KEK or WebAuthn
 *
 * Returns the DEK if successful, throws an error if it fails.
 * Uses single WebAuthn prompt by including PRF evaluation in authentication
 */
export async function attemptAutoUnlock(options: {
  passkeys: StoredPasskey[];
  rpId: string;
}) {
  requireBrowser("attemptAutoUnlock requires a browser environment");
  const { passkeys, rpId } = options;

  // Step 1: Check for cached KEK in sessionStorage
  const cachedKek = getCachedKek();

  if (cachedKek) {
    console.log("Found cached KEK, unlocking without WebAuthn...");

    const matchedPasskey = passkeys.find(
      (p) => p.credentialId === cachedKek.credentialId,
    );

    if (!matchedPasskey) {
      console.log("Cached KEK's passkey not found, clearing cache");
      clearCachedKek();
      throw new Error("Cached passkey not found");
    }

    // Unwrap DEK with cached KEK
    const kek = base64urlDecode(cachedKek.kek);
    const dek = await unwrapDekWithKek(matchedPasskey.wrappedDek, kek);

    console.log(
      "DEK unlocked successfully from cached KEK (no WebAuthn prompt)",
    );
    return dek;
  }

  // Step 2: No cached KEK, do WebAuthn authentication with PRF
  console.log("No cached KEK, triggering WebAuthn...");

  if (passkeys.length === 0) {
    throw new Error("No passkeys found");
  }

  // Generate constant PRF input
  const prfInput = await getPrfInput(rpId);

  // Prepare allowCredentials for WebAuthn
  const allowCredentials = passkeys.map((passkey) => ({
    id: base64urlDecode(passkey.credentialId).buffer,
    type: "public-key" as const,
    transports: passkey.transports as AuthenticatorTransport[],
  }));

  // Single WebAuthn call with PRF evaluation
  const challenge = generateChallenge();

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials,
      userVerification: "required",
      extensions: {
        prf: {
          eval: {
            first: prfInput,
          },
        },
      },
    },
  });

  if (!(assertion instanceof PublicKeyCredential)) {
    throw new Error("expected PublicKeyCredential");
  }

  // Extract PRF output
  const prfOutput = assertion.getClientExtensionResults().prf?.results?.first;
  if (!(prfOutput instanceof ArrayBuffer)) {
    throw new Error("PRF extension not available");
  }

  // Find matching passkey by credential ID
  const credentialIdBase64url = base64urlEncode(assertion.rawId);

  const matchedPasskey = passkeys.find(
    (p) => p.credentialId === credentialIdBase64url,
  );

  if (!matchedPasskey) {
    throw new Error("Passkey not found in stored passkeys");
  }

  // Derive KEK from PRF output + matched passkey's salt
  const kekSalt = base64urlDecode(matchedPasskey.kekSalt);
  const kek = await deriveKekFromPrfOutput(new Uint8Array(prfOutput), kekSalt);

  // Unwrap DEK with KEK
  const dek = await unwrapDekWithKek(matchedPasskey.wrappedDek, kek);

  // Cache KEK for future reloads in this session
  storeCachedKek(kek, matchedPasskey.credentialId);

  console.log("DEK auto-unlocked successfully via WebAuthn, KEK cached");
  return dek;
}

/**
 * Prepare allowCredentials array for WebAuthn from stored passkeys
 */
function prepareAllowCredentials(
  passkeys: StoredPasskey[],
): PublicKeyCredentialDescriptor[] {
  return passkeys.map((passkey) => ({
    id: base64urlDecode(passkey.credentialId).buffer,
    type: "public-key" as const,
    transports: passkey.transports as AuthenticatorTransport[],
  }));
}

/**
 * Find a passkey by credential ID
 */
function findPasskeyByCredentialId(
  passkeys: StoredPasskey[],
  credentialId: ArrayBuffer,
): StoredPasskey | null {
  const credentialIdBase64url = base64urlEncode(credentialId);
  return passkeys.find((p) => p.credentialId === credentialIdBase64url) ?? null;
}

/**
 * Complete passkey enrollment flow
 *
 * Creates PRF-enabled passkey, generates DEK, wraps it with KEK
 * Uses single WebAuthn prompt by including PRF evaluation in credential creation
 */
export async function enrollPasskey(options: {
  rpId: string;
  rpName: string;
  userDisplayName: string;
}): Promise<{
  dek: CryptoBytes;
  credentialId: string;
  publicKey: string;
  wrappedDek: string;
  kekSalt: string;
  transports: string[];
  algorithm: string;
  kek: CryptoBytes;
  rpName: string;
  rpId: string;
  webauthnUserId: string;
  webauthnUserName: string;
  webauthnUserDisplayName: string;
}> {
  requireBrowser("enrollPasskey requires a browser environment");

  // Step 1: Generate constant PRF input
  const prfInput = await getPrfInput(options.rpId);

  // Step 2: Create PRF-enabled passkey with PRF evaluation
  const userId = generateUserId();
  const userName = "e2ee-" + new Date().toISOString();
  const challenge = generateChallenge();

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: options.rpName,
        id: options.rpId,
      },
      user: {
        id: userId,
        name: userName,
        displayName: options.userDisplayName,
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
      extensions: {
        prf: {
          eval: {
            first: prfInput,
          },
        },
      },
    },
  });

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("expected PublicKeyCredential");
  }

  if (!(credential.response instanceof AuthenticatorAttestationResponse)) {
    throw new Error("expected AuthenticatorAttestationResponse");
  }

  // Step 3: Extract PRF output
  const prfOutput = credential.getClientExtensionResults().prf?.results?.first;
  if (!(prfOutput instanceof ArrayBuffer)) {
    throw new Error(
      "PRF extension not available on this credential or platform",
    );
  }

  // Step 4: Extract public key
  const publicKeyBytes = credential.response.getPublicKey();
  if (!publicKeyBytes) {
    throw new Error("public key not available in credential response");
  }

  // Step 5: Generate KEK salt and derive KEK
  const kekSalt = generateKekSalt();
  const kek = await deriveKekFromPrfOutput(new Uint8Array(prfOutput), kekSalt);

  // Step 6: Generate random DEK
  const dek = generateDek();

  // Step 7: Wrap DEK with KEK
  const wrappedDek = await wrapDekWithKek(dek, kek);

  return {
    dek,
    credentialId: base64urlEncode(credential.rawId),
    publicKey: base64urlEncode(publicKeyBytes),
    wrappedDek,
    kekSalt: base64urlEncode(kekSalt),
    transports: credential.response.getTransports(),
    algorithm: "-7",
    kek,
    rpName: options.rpName,
    rpId: options.rpId,
    webauthnUserId: base64urlEncode(userId),
    webauthnUserName: userName,
    webauthnUserDisplayName: options.userDisplayName,
  };
}

/**
 * Add an additional passkey for an existing DEK
 *
 * Creates new PRF-enabled passkey and wraps the existing DEK with new KEK
 * Uses single WebAuthn prompt by including PRF evaluation in credential creation
 */
export async function addAdditionalPasskey(options: {
  dek: CryptoBytes;
  rpId: string;
  rpName: string;
  userDisplayName: string;
}): Promise<{
  credentialId: string;
  publicKey: string;
  wrappedDek: string;
  kekSalt: string;
  transports: string[];
  algorithm: string;
  kek: CryptoBytes;
  rpName: string;
  rpId: string;
  webauthnUserId: string;
  webauthnUserName: string;
  webauthnUserDisplayName: string;
}> {
  requireBrowser("addAdditionalPasskey requires a browser environment");

  // Step 1: Generate constant PRF input
  const prfInput = await getPrfInput(options.rpId);

  // Step 2: Create PRF-enabled passkey with PRF evaluation
  const userId = generateUserId();
  const userName = "e2ee-" + new Date().toISOString();
  const challenge = generateChallenge();

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: options.rpName,
        id: options.rpId,
      },
      user: {
        id: userId,
        name: userName,
        displayName: options.userDisplayName,
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
      extensions: {
        prf: {
          eval: {
            first: prfInput,
          },
        },
      },
    },
  });

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("expected PublicKeyCredential");
  }

  if (!(credential.response instanceof AuthenticatorAttestationResponse)) {
    throw new Error("expected AuthenticatorAttestationResponse");
  }

  // Step 3: Extract PRF output
  const prfOutput = credential.getClientExtensionResults().prf?.results?.first;
  if (!(prfOutput instanceof ArrayBuffer)) {
    throw new Error(
      "PRF extension not available on this credential or platform",
    );
  }

  // Step 4: Extract public key
  const publicKeyBytes = credential.response.getPublicKey();
  if (!publicKeyBytes) {
    throw new Error("public key not available in credential response");
  }

  // Step 5: Generate new KEK salt and derive KEK
  const kekSalt = generateKekSalt();
  const kek = await deriveKekFromPrfOutput(new Uint8Array(prfOutput), kekSalt);

  // Step 6: Wrap existing DEK with new KEK
  const wrappedDek = await wrapDekWithKek(options.dek, kek);

  return {
    credentialId: base64urlEncode(credential.rawId),
    publicKey: base64urlEncode(publicKeyBytes),
    wrappedDek,
    kekSalt: base64urlEncode(kekSalt),
    transports: credential.response.getTransports(),
    algorithm: "-7",
    kek,
    rpName: options.rpName,
    rpId: options.rpId,
    webauthnUserId: base64urlEncode(userId),
    webauthnUserName: userName,
    webauthnUserDisplayName: options.userDisplayName,
  };
}

/**
 * Unlock DEK using WebAuthn passkey authentication
 *
 * Uses single WebAuthn prompt by including PRF evaluation in authentication
 */
export async function unlockWithPasskey(options: {
  passkeys: StoredPasskey[];
  rpId: string;
}): Promise<{
  dek: CryptoBytes;
  credentialId: string;
  kekSalt: string;
  kek: CryptoBytes;
}> {
  requireBrowser("unlockWithPasskey requires a browser environment");

  if (options.passkeys.length === 0) {
    throw new Error("No passkeys found. Please enroll a passkey first.");
  }

  // Step 1: Generate constant PRF input
  const prfInput = await getPrfInput(options.rpId);

  // Step 2: Prepare allowCredentials for WebAuthn
  const allowCredentials = prepareAllowCredentials(options.passkeys);

  // Step 3: Single WebAuthn call with PRF evaluation
  const challenge = generateChallenge();

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials,
      userVerification: "required",
      extensions: {
        prf: {
          eval: {
            first: prfInput,
          },
        },
      },
    },
  });

  if (!(assertion instanceof PublicKeyCredential)) {
    throw new Error("expected PublicKeyCredential");
  }

  // Step 4: Extract PRF output
  const prfOutput = assertion.getClientExtensionResults().prf?.results?.first;
  if (!(prfOutput instanceof ArrayBuffer)) {
    throw new Error("PRF extension not available");
  }

  // Step 5: Find matching passkey by credential ID
  const matchedPasskey = findPasskeyByCredentialId(
    options.passkeys,
    assertion.rawId,
  );

  if (!matchedPasskey) {
    throw new Error("Passkey not found in stored passkeys");
  }

  // Step 6: Derive KEK from PRF output + matched passkey's salt
  const kekSalt = base64urlDecode(matchedPasskey.kekSalt);
  const kek = await deriveKekFromPrfOutput(new Uint8Array(prfOutput), kekSalt);

  // Step 7: Unwrap DEK with KEK
  const dek = await unwrapDekWithKek(matchedPasskey.wrappedDek, kek);

  return {
    dek,
    credentialId: matchedPasskey.credentialId,
    kekSalt: matchedPasskey.kekSalt,
    kek,
  };
}

/**
 * Global DEK storage (memory-only, per-tab)
 *
 * Security: DEK is never persisted to disk or sessionStorage.
 * Each tab must unlock independently. Closing the tab clears the DEK.
 */
let globalDek: CryptoBytes | null = null;

type DekStateChangeListener = (event: { isUnlocked: boolean }) => void;

const dekStateChangeListeners: DekStateChangeListener[] = [];

/**
 * Register a listener for DEK state changes
 *
 * Returns a cleanup function to remove the listener
 */
export function onDekStateChange(listener: DekStateChangeListener) {
  dekStateChangeListeners.push(listener);
  return () => {
    const index = dekStateChangeListeners.indexOf(listener);
    if (index !== -1) {
      dekStateChangeListeners.splice(index, 1);
    }
  };
}

type DekUnlockCallback = () => void;

/**
 * Register a callback to be called when DEK is unlocked
 *
 * Convenience wrapper around onDekStateChange that only fires on unlock.
 * Used by encrypted collections to process queued decryption work.
 *
 * Returns a cleanup function to remove the listener.
 */
export function onDekUnlock(callback: DekUnlockCallback) {
  return onDekStateChange((event) => {
    if (event.isUnlocked) {
      callback();
    }
  });
}

/**
 * Notify all listeners of DEK state change
 */
function notifyDekStateChange(isUnlocked: boolean) {
  for (const listener of dekStateChangeListeners) {
    listener({ isUnlocked });
  }
}

/**
 * Store DEK in memory for the current tab session
 */
export function setGlobalDek(dek: CryptoBytes) {
  if (dek.byteLength !== 32) {
    throw new Error("DEK must be 32 bytes");
  }
  globalDek = dek;
  notifyDekStateChange(true);
}

/**
 * Get the current DEK from memory
 *
 * Throws if DEK is not available (user must unlock first)
 */
export function getGlobalDek() {
  if (!globalDek) {
    throw new Error("DEK not available. User must unlock E2EE first.");
  }
  return globalDek;
}

/**
 * Clear the DEK from memory (e.g., on lock)
 */
export function clearGlobalDek() {
  globalDek = null;
  notifyDekStateChange(false);
}

/**
 * Check if DEK is available in memory
 */
export function hasGlobalDek() {
  return globalDek !== null;
}

/**
 * Encrypt a field value using AES-256-GCM
 *
 * Returns base64url(nonce || ciphertext) where:
 * - nonce: 12-byte random nonce
 * - ciphertext: encrypted data + 16-byte auth tag
 *
 * Uses random nonce for each encryption, so encrypting the same plaintext twice
 * produces different ciphertext.
 */
export async function encryptField(plaintext: string, dek: CryptoBytes) {
  if (dek.byteLength !== 32) {
    throw new Error("DEK must be 32 bytes for AES-256-GCM");
  }

  // Generate random 12-byte nonce for AES-GCM
  const nonce = generateNonce();

  // Import DEK for AES-GCM encryption
  const key = await crypto.subtle.importKey(
    "raw",
    dek,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  // Encrypt plaintext
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    plaintextBytes,
  );

  // Concatenate nonce + ciphertext for storage
  const encrypted = new Uint8Array(nonce.byteLength + ciphertext.byteLength);
  encrypted.set(nonce, 0);
  encrypted.set(new Uint8Array(ciphertext), nonce.byteLength);

  return base64urlEncode(encrypted);
}

/**
 * Decrypt a field value using AES-256-GCM
 *
 * Takes base64url(nonce || ciphertext) and returns plaintext string
 */
export async function decryptField(encrypted: string, dek: CryptoBytes) {
  if (dek.byteLength !== 32) {
    throw new Error("DEK must be 32 bytes for AES-256-GCM");
  }

  // Decode base64url
  const encryptedBytes = base64urlDecode(encrypted);

  // Extract nonce (first 12 bytes) and ciphertext (rest)
  const nonce = encryptedBytes.slice(0, 12);
  const ciphertext = encryptedBytes.slice(12);

  // Import DEK for AES-GCM decryption
  const key = await crypto.subtle.importKey(
    "raw",
    dek,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  // Decrypt ciphertext
  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    ciphertext,
  );

  // Decode to string
  return new TextDecoder().decode(plaintextBuffer);
}
