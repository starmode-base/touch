/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

interface KekDerivationOptions {
  /** Per-user random salt stored server-side */
  kekSalt: Uint8Array;
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
  if (byteLength <= 0) throw new Error("kek salt length must be > 0");
  const salt = new Uint8Array(byteLength);
  crypto.getRandomValues(salt);
  return salt;
}

function asArrayBufferView(view: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(
    view.buffer as ArrayBuffer,
    view.byteOffset,
    view.byteLength,
  );
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", asArrayBufferView(data));
  return new Uint8Array(digest);
}

function toUint8(arrayBuffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(arrayBuffer);
}

interface CreatePrfPasskeyOptions {
  rpName?: string;
  rpId?: string;
  userName?: string;
  userDisplayName?: string;
}

interface CreatedPrfCredential {
  rawId: Uint8Array;
  prfEnabled: boolean;
  transports?: AuthenticatorTransport[];
}

/**
 * Create a PRF-enabled resident credential for E2EE
 */
export async function createPrfPasskey(
  options?: CreatePrfPasskeyOptions,
): Promise<CreatedPrfCredential> {
  requireBrowser("create prf passkey requires a browser environment");

  const rpName = options?.rpName ?? "Touch";
  const rpId =
    options?.rpId ?? (typeof location !== "undefined" ? location.hostname : "");
  const userName = options?.userName ?? "e2ee";
  const userDisplayName = options?.userDisplayName ?? "E2EE key";

  const userId = new Uint8Array(32);
  crypto.getRandomValues(userId);

  const prfSeed = new Uint8Array(32);
  crypto.getRandomValues(prfSeed);

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: prfSeed,
    rp: { name: rpName, id: rpId },
    user: { id: userId, name: userName, displayName: userDisplayName },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }],
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
    extensions: {
      prf: {
        enable: true,
        eval: { first: prfSeed },
      },
    } as any,
  };

  const credential = (await navigator.credentials.create({
    publicKey,
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("failed to create prf-enabled credential");

  const ext: any = credential.getClientExtensionResults?.();
  const prfEnabled = ext?.prf?.enabled === true;

  let transports: AuthenticatorTransport[] | undefined;
  const response = (credential as any).response as
    | { getTransports?: () => AuthenticatorTransport[] }
    | undefined;
  if (typeof response?.getTransports === "function") {
    try {
      transports = response.getTransports();
    } catch {
      // ignore
    }
  }

  return { rawId: toUint8(credential.rawId), prfEnabled, transports };
}

async function getWebAuthnPrf(firstInput: Uint8Array): Promise<Uint8Array> {
  requireBrowser("webauthn prf requires a browser environment");

  // Challenge must be provided; it can be any fresh random value
  const challenge = new Uint8Array(32);
  // Note, getRandomValues modifies the challenge array in-place
  crypto.getRandomValues(challenge);

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge,
    userVerification: "required",
    extensions: {
      // Request PRF evaluation on a single input vector ('first')
      prf: {
        eval: { first: firstInput },
      },
    } as any,
  };

  const credential = (await navigator.credentials.get({
    publicKey,
  })) as PublicKeyCredential;

  if (!credential)
    throw new Error("webauthn prf failed: no credential returned");

  // Extract PRF client extension results
  const ext: any = credential.getClientExtensionResults();
  const prf = ext?.prf;
  const results = prf?.results;
  const first = results?.first as ArrayBuffer | undefined;

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
    asArrayBufferView(ikm),
    "HKDF",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: asArrayBufferView(salt),
      info: asArrayBufferView(info),
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
  const { kekSalt, hkdfInfo = "kek-v1", prfContext = "kek" } = options;
  if (!(kekSalt instanceof Uint8Array))
    throw new Error("kekSalt must be Uint8Array");

  // Bind PRF input to origin and context to avoid cross-origin re-use
  const origin =
    typeof location !== "undefined" ? location.origin : "unknown-origin";
  const prfLabelBytes = new TextEncoder().encode(
    `${origin}::${prfContext}::v1`,
  );
  const firstInput = await sha256(prfLabelBytes); // 32 bytes

  const prfOutput = await getWebAuthnPrf(firstInput);
  if (prfOutput.byteLength !== 32) {
    // Current implementations return 32 bytes; fail fast if unexpected
    throw new Error("unexpected prf output length");
  }

  const infoBytes = new TextEncoder().encode(hkdfInfo);
  const kek = await hkdfExtractAndExpand(prfOutput, kekSalt, infoBytes, 256);
  return { kek, prfOutput };
}

export function toHex(u8: Uint8Array) {
  return Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");
}
