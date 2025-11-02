/**
 * Documentation:
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/WebAuthn_extensions#prf
 * https://w3c.github.io/webauthn/#prf-extension
 */

/**
 * Base64url encoding utilities
 */
function base64urlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64urlDecode(base64url: string): Uint8Array {
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

function requireBrowser(message: string): void {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    throw new Error(message);
  }
}

function generateKekSalt(byteLength = 16): Uint8Array {
  if (byteLength <= 0) {
    throw new Error("kek salt length must be positive");
  }

  return crypto.getRandomValues(new Uint8Array(byteLength));
}

function ensureArrayBuffer(view: Uint8Array): Uint8Array<ArrayBuffer> {
  if (!(view.buffer instanceof ArrayBuffer)) {
    throw new Error("SharedArrayBuffer not supported for crypto operations");
  }

  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", ensureArrayBuffer(data));

  return new Uint8Array(digest);
}

async function hkdfExtractAndExpand(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  lengthBits: number,
): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    ensureArrayBuffer(ikm),
    "HKDF",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: ensureArrayBuffer(salt),
      info: ensureArrayBuffer(info),
    },
    baseKey,
    lengthBits,
  );
  return new Uint8Array(bits);
}

/**
 * Generate constant PRF input for all passkeys
 *
 * This input is constant for a given origin, allowing single-prompt authentication.
 * Per-passkey KEK differentiation happens via unique kekSalt values in HKDF.
 */
async function getPrfInput(origin: string): Promise<Uint8Array> {
  if (!origin) {
    throw new Error("origin is required for PRF context binding");
  }

  const prfLabelBytes = new TextEncoder().encode(`${origin}::kek::v1`);
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
  prfOutput: Uint8Array,
  kekSalt: Uint8Array,
  hkdfInfo = "kek-v1",
): Promise<Uint8Array> {
  if (prfOutput.byteLength !== 32) {
    throw new Error("PRF output must be 32 bytes");
  }

  if (kekSalt.byteLength < 16) {
    throw new Error("kekSalt must be at least 16 bytes");
  }

  const infoBytes = new TextEncoder().encode(hkdfInfo);
  return await hkdfExtractAndExpand(prfOutput, kekSalt, infoBytes, 256);
}

export function toHex(u8: Uint8Array) {
  return Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a random 32-byte DEK (Data Encryption Key)
 */
export function generateDek(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Wrap (encrypt) a DEK using a KEK with AES-GCM
 *
 * Returns base64url-encoded wrapped DEK (includes nonce + ciphertext + auth tag)
 */
async function wrapDekWithKek(
  dek: Uint8Array,
  kek: Uint8Array,
): Promise<string> {
  if (dek.byteLength !== 32) {
    throw new Error("dek must be 32 bytes");
  }

  if (kek.byteLength !== 32) {
    throw new Error("kek must be 32 bytes");
  }

  // Generate random 12-byte nonce for AES-GCM
  const nonce = crypto.getRandomValues(new Uint8Array(12));

  // Import KEK for AES-GCM
  const kekKey = await crypto.subtle.importKey(
    "raw",
    ensureArrayBuffer(kek),
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  // Encrypt DEK with KEK
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ensureArrayBuffer(nonce) },
    kekKey,
    ensureArrayBuffer(dek),
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
async function unwrapDekWithKek(
  wrappedDekBase64url: string,
  kek: Uint8Array,
): Promise<Uint8Array> {
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
    ensureArrayBuffer(kek),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  // Decrypt ciphertext to get DEK
  const dekBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ensureArrayBuffer(nonce) },
    kekKey,
    ensureArrayBuffer(ciphertext),
  );

  return new Uint8Array(dekBuffer);
}

/**
 * Passkey with wrapped DEK from server
 */
interface StoredPasskey {
  credentialId: string;
  wrappedDek: string;
  kekSalt: string;
  transports: string[];
}

interface CachedKek {
  kek: string; // hex-encoded
  credentialId: string;
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
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

  return bytes.buffer;
}

/**
 * Convert an ArrayBuffer to a base64url string
 */
function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

const KEK_STORAGE_KEY = "e2ee_kek";

/**
 * Get the cached KEK from sessionStorage
 */
function getCachedKek(): CachedKek | null {
  const cached = sessionStorage.getItem(KEK_STORAGE_KEY);
  if (!cached) return null;

  try {
    return JSON.parse(cached) as CachedKek;
  } catch {
    return null;
  }
}

/**
 * Check if a cached KEK exists
 */
export function hasCachedKek(): boolean {
  return getCachedKek() !== null;
}

/**
 * Store a cached KEK in sessionStorage
 */
export function storeCachedKek(kek: Uint8Array, credentialId: string): void {
  const cached: CachedKek = {
    kek: toHex(kek),
    credentialId,
  };
  sessionStorage.setItem(KEK_STORAGE_KEY, JSON.stringify(cached));
}

/**
 * Clear the cached KEK from sessionStorage
 */
export function clearCachedKek(): void {
  sessionStorage.removeItem(KEK_STORAGE_KEY);
}

/**
 * Attempt to auto-unlock the DEK using cached KEK or WebAuthn
 *
 * Returns the DEK if successful, throws an error if it fails.
 * Uses single WebAuthn prompt by including PRF evaluation in authentication
 */
export async function attemptAutoUnlock(
  passkeys: StoredPasskey[],
): Promise<Uint8Array> {
  requireBrowser("attemptAutoUnlock requires a browser environment");

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
    const kek = hexToUint8Array(cachedKek.kek);
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
  const prfInput = await getPrfInput(location.origin);

  // Prepare allowCredentials for WebAuthn
  const allowCredentials = passkeys.map((passkey) => ({
    id: base64urlToArrayBuffer(passkey.credentialId),
    type: "public-key" as const,
    transports: passkey.transports as AuthenticatorTransport[],
  }));

  // Single WebAuthn call with PRF evaluation
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials,
      userVerification: "required",
      extensions: {
        prf: {
          eval: {
            first: ensureArrayBuffer(prfInput),
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
  const credentialIdBase64url = btoa(
    String.fromCharCode(...new Uint8Array(assertion.rawId)),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const matchedPasskey = passkeys.find(
    (p) => p.credentialId === credentialIdBase64url,
  );

  if (!matchedPasskey) {
    throw new Error("Passkey not found in stored passkeys");
  }

  // Derive KEK from PRF output + matched passkey's salt
  const kekSalt = hexToUint8Array(matchedPasskey.kekSalt);
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
    id: base64urlToArrayBuffer(passkey.credentialId),
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
  const credentialIdBase64url = arrayBufferToBase64url(credentialId);
  return passkeys.find((p) => p.credentialId === credentialIdBase64url) ?? null;
}

interface EnrollPasskeyOptions {
  rpId: string;
  rpName: string;
  userDisplayName: string;
  origin: string;
}

interface EnrollPasskeyResult {
  dek: Uint8Array;
  credentialId: string;
  publicKey: string;
  wrappedDek: string;
  kekSalt: string;
  transports: string[];
  algorithm: string;
  kek: Uint8Array;
}

/**
 * Complete passkey enrollment flow
 *
 * Creates PRF-enabled passkey, generates DEK, wraps it with KEK
 * Uses single WebAuthn prompt by including PRF evaluation in credential creation
 */
export async function enrollPasskey(
  options: EnrollPasskeyOptions,
): Promise<EnrollPasskeyResult> {
  requireBrowser("enrollPasskey requires a browser environment");

  // Step 1: Generate constant PRF input
  const prfInput = await getPrfInput(options.origin);

  // Step 2: Create PRF-enabled passkey with PRF evaluation
  const userId = crypto.getRandomValues(new Uint8Array(32));
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: options.rpName,
        id: options.rpId,
      },
      user: {
        id: userId,
        name: "e2ee-" + new Date().toISOString(),
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
            first: ensureArrayBuffer(prfInput),
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
  const kekSalt = generateKekSalt(32);
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
    kekSalt: toHex(kekSalt),
    transports: credential.response.getTransports(),
    algorithm: "-7",
    kek,
  };
}

interface AddAdditionalPasskeyOptions {
  dek: Uint8Array;
  rpId: string;
  rpName: string;
  userDisplayName: string;
  origin: string;
}

interface AddAdditionalPasskeyResult {
  credentialId: string;
  publicKey: string;
  wrappedDek: string;
  kekSalt: string;
  transports: string[];
  algorithm: string;
  kek: Uint8Array;
}

/**
 * Add an additional passkey for an existing DEK
 *
 * Creates new PRF-enabled passkey and wraps the existing DEK with new KEK
 * Uses single WebAuthn prompt by including PRF evaluation in credential creation
 */
export async function addAdditionalPasskey(
  options: AddAdditionalPasskeyOptions,
): Promise<AddAdditionalPasskeyResult> {
  requireBrowser("addAdditionalPasskey requires a browser environment");

  // Step 1: Generate constant PRF input
  const prfInput = await getPrfInput(options.origin);

  // Step 2: Create PRF-enabled passkey with PRF evaluation
  const userId = crypto.getRandomValues(new Uint8Array(32));
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: options.rpName,
        id: options.rpId,
      },
      user: {
        id: userId,
        name: "e2ee-" + new Date().toISOString(),
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
            first: ensureArrayBuffer(prfInput),
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
  const kekSalt = generateKekSalt(32);
  const kek = await deriveKekFromPrfOutput(new Uint8Array(prfOutput), kekSalt);

  // Step 6: Wrap existing DEK with new KEK
  const wrappedDek = await wrapDekWithKek(options.dek, kek);

  return {
    credentialId: base64urlEncode(credential.rawId),
    publicKey: base64urlEncode(publicKeyBytes),
    wrappedDek,
    kekSalt: toHex(kekSalt),
    transports: credential.response.getTransports(),
    algorithm: "-7",
    kek,
  };
}

interface UnlockWithPasskeyOptions {
  passkeys: StoredPasskey[];
  origin: string;
}

interface UnlockWithPasskeyResult {
  dek: Uint8Array;
  credentialId: string;
  kekSalt: string;
  kek: Uint8Array;
}

/**
 * Unlock DEK using WebAuthn passkey authentication
 *
 * Uses single WebAuthn prompt by including PRF evaluation in authentication
 */
export async function unlockWithPasskey(
  options: UnlockWithPasskeyOptions,
): Promise<UnlockWithPasskeyResult> {
  requireBrowser("unlockWithPasskey requires a browser environment");

  if (options.passkeys.length === 0) {
    throw new Error("No passkeys found. Please enroll a passkey first.");
  }

  // Step 1: Generate constant PRF input
  const prfInput = await getPrfInput(options.origin);

  // Step 2: Prepare allowCredentials for WebAuthn
  const allowCredentials = prepareAllowCredentials(options.passkeys);

  // Step 3: Single WebAuthn call with PRF evaluation
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials,
      userVerification: "required",
      extensions: {
        prf: {
          eval: {
            first: ensureArrayBuffer(prfInput),
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
  const kekSalt = hexToUint8Array(matchedPasskey.kekSalt);
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
let globalDek: Uint8Array | null = null;

/**
 * DEK state change event
 */
interface DekStateChangeEvent {
  isUnlocked: boolean;
}

type DekStateChangeListener = (event: DekStateChangeEvent) => void;

const dekStateChangeListeners: DekStateChangeListener[] = [];

/**
 * Register a listener for DEK state changes
 *
 * Returns a cleanup function to remove the listener
 */
export function onDekStateChange(listener: DekStateChangeListener): () => void {
  dekStateChangeListeners.push(listener);
  return () => {
    const index = dekStateChangeListeners.indexOf(listener);
    if (index !== -1) {
      dekStateChangeListeners.splice(index, 1);
    }
  };
}

/**
 * Notify all listeners of DEK state change
 */
function notifyDekStateChange(isUnlocked: boolean): void {
  const event: DekStateChangeEvent = { isUnlocked };
  for (const listener of dekStateChangeListeners) {
    listener(event);
  }
}

/**
 * Store DEK in memory for the current tab session
 */
export function setGlobalDek(dek: Uint8Array): void {
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
export function getGlobalDek(): Uint8Array {
  if (!globalDek) {
    throw new Error("DEK not available. User must unlock E2EE first.");
  }
  return globalDek;
}

/**
 * Clear the DEK from memory (e.g., on lock)
 */
export function clearGlobalDek(): void {
  globalDek = null;
  notifyDekStateChange(false);
}

/**
 * Check if DEK is available in memory
 */
export function hasGlobalDek(): boolean {
  return globalDek !== null;
}

/**
 * Encrypt a field value using AES-256-GCM
 *
 * Returns base64url(iv || ciphertext) where:
 * - iv: 12-byte random nonce
 * - ciphertext: encrypted data + 16-byte auth tag
 *
 * Uses random IV for each encryption, so encrypting the same plaintext twice
 * produces different ciphertext.
 */
export async function encryptField(
  plaintext: string,
  dek: Uint8Array,
): Promise<string> {
  if (dek.byteLength !== 32) {
    throw new Error("DEK must be 32 bytes for AES-256-GCM");
  }

  // Generate random 12-byte IV (nonce) for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Import DEK for AES-GCM encryption
  const key = await crypto.subtle.importKey(
    "raw",
    ensureArrayBuffer(dek),
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  // Encrypt plaintext
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ensureArrayBuffer(iv) },
    key,
    ensureArrayBuffer(plaintextBytes),
  );

  // Concatenate iv + ciphertext for storage
  const encrypted = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  encrypted.set(iv, 0);
  encrypted.set(new Uint8Array(ciphertext), iv.byteLength);

  return base64urlEncode(encrypted);
}

/**
 * Decrypt a field value using AES-256-GCM
 *
 * Takes base64url(iv || ciphertext) and returns plaintext string
 */
export async function decryptField(
  encrypted: string,
  dek: Uint8Array,
): Promise<string> {
  if (dek.byteLength !== 32) {
    throw new Error("DEK must be 32 bytes for AES-256-GCM");
  }

  // Decode base64url
  const encryptedBytes = base64urlDecode(encrypted);

  // Extract IV (first 12 bytes) and ciphertext (rest)
  const iv = encryptedBytes.slice(0, 12);
  const ciphertext = encryptedBytes.slice(12);

  // Import DEK for AES-GCM decryption
  const key = await crypto.subtle.importKey(
    "raw",
    ensureArrayBuffer(dek),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  // Decrypt ciphertext
  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ensureArrayBuffer(iv) },
    key,
    ensureArrayBuffer(ciphertext),
  );

  // Decode to string
  return new TextDecoder().decode(plaintextBuffer);
}
