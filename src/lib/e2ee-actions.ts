/**
 * E2EE actions
 *
 * Application-level functions that coordinate across multiple boundaries
 * (session, passkeys, stores)
 */
import { passkeysCollection } from "~/collections/passkeys";
import { cryptoSession } from "./e2ee-session";
import { base64urlDecode, unwrapDekWithKek, type CryptoBytes } from "./e2ee";

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
