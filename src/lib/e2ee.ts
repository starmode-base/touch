// WebAuthn PRF extension types (not yet in standard TypeScript definitions)
interface PrfExtensionResults {
  prf?: {
    enabled?: boolean;
    results?: {
      first?: ArrayBuffer;
      second?: ArrayBuffer;
    };
  };
}

interface AuthenticatorAttestationResponseWithTransports {
  getTransports?: () => AuthenticatorTransport[];
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

function asArrayBufferView(view: Uint8Array): Uint8Array<ArrayBuffer> {
  if (view.buffer instanceof SharedArrayBuffer) {
    throw new Error("SharedArrayBuffer not supported for crypto operations");
  }

  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", asArrayBufferView(data));

  return new Uint8Array(digest);
}

function toUint8(arrayBuffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(arrayBuffer);
}

interface CreatePrfPasskeyOptions {
  /** Relying Party ID (required, typically the domain) */
  rpId: string;
  rpName?: string;
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
  options: CreatePrfPasskeyOptions,
): Promise<CreatedPrfCredential> {
  requireBrowser("create prf passkey requires a browser environment");

  if (!options.rpId) {
    throw new Error("rpId is required");
  }

  const rpName = options.rpName ?? "Touch";
  const userName = options.userName ?? "e2ee";
  const userDisplayName = options.userDisplayName ?? "E2EE key";

  const userId = new Uint8Array(32);
  crypto.getRandomValues(userId);

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const prfSeed = new Uint8Array(32);
  crypto.getRandomValues(prfSeed);

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: { name: rpName, id: options.rpId },
    user: { id: userId, name: userName, displayName: userDisplayName },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }],
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
    // PRF extension not in standard WebAuthn types, requires any
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    extensions: {
      prf: {
        enable: true,
        eval: { first: prfSeed },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  };

  const credential = (await navigator.credentials.create({
    publicKey,
  })) as PublicKeyCredential | null;
  if (!credential) {
    throw new Error(
      "failed to create prf-enabled credential: user cancelled or no authenticator available",
    );
  }

  const ext = credential.getClientExtensionResults() as PrfExtensionResults;
  const prfEnabled = ext.prf?.enabled === true;

  let transports: AuthenticatorTransport[] | undefined;
  const response =
    credential.response as AuthenticatorAttestationResponseWithTransports;
  if (typeof response.getTransports === "function") {
    transports = response.getTransports();
  }

  return { rawId: toUint8(credential.rawId), prfEnabled, transports };
}

async function getWebAuthnPrf(firstInput: Uint8Array): Promise<Uint8Array> {
  requireBrowser("webauthn prf requires a browser environment");

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge,
    userVerification: "required",
    // PRF extension not in standard WebAuthn types, requires any
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    extensions: {
      prf: {
        eval: { first: firstInput },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  };

  const credential = (await navigator.credentials.get({
    publicKey,
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error(
      "webauthn prf failed: no credential returned (user cancelled or no matching credential)",
    );
  }

  const ext = credential.getClientExtensionResults() as PrfExtensionResults;
  const first = ext.prf?.results?.first;

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
