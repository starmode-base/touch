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

interface KekDerivationOptions {
  /** Per-user random salt stored server-side (16-64 bytes recommended) */
  kekSalt: Uint8Array;
  /** Origin for PRF context binding (e.g., location.origin) */
  origin: string;
  /** Optional HKDF info label; defaults to 'kek-v1' */
  hkdfInfo?: string;
  /** Optional PRF context label included in the PRF input; defaults to 'kek' */
  prfContext?: string;
}

function requireBrowser(message: string): void {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    throw new Error(message);
  }
}

export function generateKekSalt(byteLength = 16): Uint8Array {
  if (byteLength <= 0) {
    throw new Error("kek salt length must be positive");
  }

  const salt = new Uint8Array(byteLength);
  crypto.getRandomValues(salt);

  return salt;
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

function toUint8(arrayBuffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(arrayBuffer);
}

/**
 * Create a PRF-enabled resident credential for E2EE
 *
 * Returns credential details including the public key for future authentication
 * (Option 2 migration), though the public key is not used yet in Option 1 where
 * Clerk handles authentication.
 */
export async function createPrfPasskey(options: {
  /** Relying Party ID (required, typically the domain) */
  rpId: string;
  rpName?: string;
  userName?: string;
  userDisplayName?: string;
}) {
  requireBrowser("create prf passkey requires a browser environment");

  if (!options.rpId) {
    throw new Error("rpId is required");
  }

  const rpName = options.rpName ?? "Touch";
  const userName = options.userName ?? "e2ee-" + new Date().toISOString();
  const userDisplayName = options.userDisplayName ?? "E2EE key";

  const userId = new Uint8Array(32);
  crypto.getRandomValues(userId);

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const prfSeed = new Uint8Array(32);
  crypto.getRandomValues(prfSeed);

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: rpName,
        id: options.rpId,
      },
      user: {
        id: userId,
        name: userName,
        displayName: userDisplayName,
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
      extensions: {
        prf: {
          eval: {
            first: prfSeed,
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

  // Extract public key (for future authentication in Option 2)
  const publicKeyBytes = credential.response.getPublicKey();
  if (!publicKeyBytes) {
    throw new Error("public key not available in credential response");
  }

  return {
    credentialId: base64urlEncode(credential.rawId),
    publicKey: base64urlEncode(publicKeyBytes),
    transports: credential.response.getTransports(),
    algorithm: -7, // ES256
  };
}

async function getWebAuthnPrf(firstInput: Uint8Array): Promise<Uint8Array> {
  requireBrowser("webauthn prf requires a browser environment");

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge,
    userVerification: "required",
    extensions: {
      prf: {
        eval: {
          first: ensureArrayBuffer(firstInput),
        },
      },
    },
  };

  const credential = await navigator.credentials.get({ publicKey });

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("expected PublicKeyCredential");
  }

  const first = credential.getClientExtensionResults().prf?.results?.first;

  if (!(first instanceof ArrayBuffer)) {
    throw new Error(
      "webauthn prf not available on this credential or platform",
    );
  }

  return toUint8(first);
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
 * Derive a KEK using WebAuthn PRF output and HKDF-SHA256
 */
export async function deriveKekWithWebAuthn(
  options: KekDerivationOptions,
): Promise<{
  kek: Uint8Array; // 32 bytes
  prfOutput: Uint8Array; // 32 bytes
}> {
  const { kekSalt, origin, hkdfInfo = "kek-v1", prfContext = "kek" } = options;

  if (kekSalt.byteLength < 16) {
    throw new Error("kekSalt length must be at least 16 bytes");
  }

  if (!origin) {
    throw new Error("origin is required for PRF context binding");
  }

  // Bind PRF input to origin and context to avoid cross-origin re-use
  const prfLabelBytes = new TextEncoder().encode(
    `${origin}::${prfContext}::v1`,
  );

  const firstInput = await sha256(prfLabelBytes);

  const prfOutput = await getWebAuthnPrf(firstInput);
  if (prfOutput.byteLength !== 32) {
    throw new Error(
      `unexpected prf output length: expected 32 bytes, got ${prfOutput.byteLength}`,
    );
  }

  const infoBytes = new TextEncoder().encode(hkdfInfo);
  const kek = await hkdfExtractAndExpand(prfOutput, kekSalt, infoBytes, 256);

  return { kek, prfOutput };
}

export function toHex(u8: Uint8Array) {
  return Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a random 32-byte DEK (Data Encryption Key)
 */
export function generateDek(): Uint8Array {
  const dek = new Uint8Array(32);
  crypto.getRandomValues(dek);
  return dek;
}

/**
 * Wrap (encrypt) a DEK using a KEK with AES-GCM
 *
 * Returns base64url-encoded wrapped DEK (includes nonce + ciphertext + auth tag)
 */
export async function wrapDekWithKek(
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
  const nonce = new Uint8Array(12);
  crypto.getRandomValues(nonce);

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
export async function unwrapDekWithKek(
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
export interface StoredPasskey {
  credentialId: string;
  wrappedDek: string;
  kekSalt: string;
  transports: string[];
}

interface CachedKek {
  kek: string; // hex-encoded
  credentialId: string;
  kekSalt: string; // hex-encoded
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

const KEK_STORAGE_KEY = "e2ee_kek";

function getCachedKek(): CachedKek | null {
  const cached = sessionStorage.getItem(KEK_STORAGE_KEY);
  if (!cached) return null;

  try {
    return JSON.parse(cached) as CachedKek;
  } catch {
    return null;
  }
}

export function storeCachedKek(
  kek: Uint8Array,
  credentialId: string,
  kekSalt: string,
): void {
  const cached: CachedKek = {
    kek: toHex(kek),
    credentialId,
    kekSalt,
  };
  sessionStorage.setItem(KEK_STORAGE_KEY, JSON.stringify(cached));
}

export function clearCachedKek(): void {
  sessionStorage.removeItem(KEK_STORAGE_KEY);
}

/**
 * Attempt to auto-unlock the DEK using cached KEK or WebAuthn
 *
 * Returns the DEK if successful, throws an error if it fails.
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

  // Step 2: No cached KEK, do WebAuthn authentication
  console.log("No cached KEK, triggering WebAuthn...");

  if (passkeys.length === 0) {
    throw new Error("No passkeys found");
  }

  // Prepare allowCredentials for WebAuthn
  const allowCredentials = passkeys.map((passkey) => ({
    id: base64urlToArrayBuffer(passkey.credentialId),
    type: "public-key" as const,
    transports: passkey.transports as AuthenticatorTransport[],
  }));

  // Trigger WebAuthn authentication
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials,
      userVerification: "required",
    },
  });

  if (!(assertion instanceof PublicKeyCredential)) {
    throw new Error("expected PublicKeyCredential");
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

  // Derive KEK using the matched passkey's salt
  const kekSalt = hexToUint8Array(matchedPasskey.kekSalt);
  const { kek } = await deriveKekWithWebAuthn({
    kekSalt,
    origin: location.origin,
  });

  // Unwrap DEK with KEK
  const dek = await unwrapDekWithKek(matchedPasskey.wrappedDek, kek);

  // Cache KEK for future reloads in this session
  storeCachedKek(kek, matchedPasskey.credentialId, matchedPasskey.kekSalt);

  console.log("DEK auto-unlocked successfully via WebAuthn, KEK cached");
  return dek;
}
