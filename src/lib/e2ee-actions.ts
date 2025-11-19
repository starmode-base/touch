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

  const passkeys = Array.from(passkeysCollection.entries());

  // Passkeys collection not yet loaded
  if (passkeys.length === 0) {
    return null;
  }

  const matchedPasskey = passkeys.find(
    ([, passkey]) => passkey.credential_id === session.credentialId,
  );

  // Session references a passkey that doesn't exist (cleared from server?)
  if (!matchedPasskey) {
    cryptoSession.clear();
    return null;
  }

  // Unwrap DEK with cached KEK
  const kek = base64urlDecode(session.kek);
  const dek = await unwrapDekWithKek(matchedPasskey[1].wrapped_dek, kek);

  return dek;
}
