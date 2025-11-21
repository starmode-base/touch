/**
 * E2EE actions
 *
 * Application-level functions that coordinate across multiple boundaries
 * (session, passkeys, stores)
 */
import { passkeysCollection, type Passkey } from "~/collections/passkeys";
import { cryptoSession } from "./e2ee-session";
import {
  addPasskey,
  base64urlDecode,
  generateDek,
  unlockWithPasskey,
  unwrapDekWithKek,
  type CryptoBytes,
  type StoredPasskey,
} from "./e2ee";
import { genSecureToken } from "./secure-token";
import { contactsStore } from "~/collections/contacts";

/**
 * Get the DEK using the current KEK and credential ID from session
 *
 * Returns null if session doesn't exist or passkeys collection not ready
 */
export async function getSessionDek(): Promise<CryptoBytes | null> {
  const session = cryptoSession.get();
  if (!session) {
    return null;
  }

  const passkeys = passkeysCollection.toArray;

  // Passkeys collection not yet loaded
  if (passkeys.length === 0) {
    return null;
  }

  const matchedPasskey = passkeys.find(
    (passkey) => passkey.credential_id === session.credentialId,
  );

  // Session references a passkey that doesn't exist (cleared from server?)
  if (!matchedPasskey) {
    console.warn(
      "Session references a passkey that doesn't exist - clearing session",
    );
    cryptoSession.clear();
    return null;
  }

  // Unwrap DEK with cached KEK
  const kek = base64urlDecode(session.kek);
  const dek = await unwrapDekWithKek(matchedPasskey.wrapped_dek, kek);

  return dek;
}

/**
 * Create a passkey with a provided DEK
 */
async function createPasskey(dek: CryptoBytes) {
  const result = await addPasskey({
    dek,
    rpId: location.hostname,
    rpName: "Touch",
    userDisplayName: "Touch Encryption Key",
    userName: "Touch" + new Date().toISOString(),
  });

  // Insert into Electric collection (will sync to server via onInsert)
  passkeysCollection.insert({
    id: genSecureToken(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: "", // Will be set server-side
    credential_id: result.credentialId,
    public_key: result.publicKey,
    wrapped_dek: result.wrappedDek,
    kek_salt: result.kekSalt,
    transports: result.transports,
    algorithm: result.algorithm,
    rp_name: result.rpName,
    rp_id: result.rpId,
    webauthn_user_id: result.webauthnUserId,
    webauthn_user_name: result.webauthnUserName,
    webauthn_user_display_name: result.webauthnUserDisplayName,
  });

  cryptoSession.set(result.kek, result.credentialId);
}

/**
 * Create a passkey (enrollment)
 *
 * Creates a new passkey in the passkey collection and updates the session
 */
export async function createPasskeyAction() {
  const dek = generateDek();

  await createPasskey(dek);
}

/**
 * Add a passkey (additional passkey)
 *
 * Adds a new passkey to the existing passkey collection and updates the session
 */
export async function addPasskeyAction() {
  const dek = await getSessionDek();

  if (!dek) {
    throw new Error("No DEK available");
  }

  return createPasskey(dek);
}

/**
 * Unlock the session with the provided passkeys
 */
export async function unlockAction(passkeys: Passkey[]) {
  // Convert to StoredPasskey format
  const storedPasskeys: StoredPasskey[] = passkeys.map((p) => ({
    credentialId: p.credential_id,
    wrappedDek: p.wrapped_dek,
    kekSalt: p.kek_salt,
    transports: p.transports,
    createdAt: p.created_at,
  }));

  const result = await unlockWithPasskey({
    passkeys: storedPasskeys,
    rpId: location.hostname,
  });

  cryptoSession.set(result.kek, result.credentialId);
  contactsStore.startSync();
}

/**
 * Lock the session
 */
export async function lockAction() {
  // Clear local store (encrypted and decrypted data)
  await contactsStore.clear();
  // Lock passkeys
  cryptoSession.clear();
}

// Delete passkey operation
export function deletePasskeyAction(id: string) {
  // Delete from Electric collection (will sync to server via onDelete)
  passkeysCollection.delete(id);
}
