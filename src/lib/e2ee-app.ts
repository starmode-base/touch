import { passkeysCollection } from "~/collections/passkeys";
import { cryptoSession } from "./e2ee-session";
import { base64urlDecode, unwrapDekWithKek } from "./e2ee";

/**
 * Get the current DEK from sessionStorage
 */
export async function getSessionDek() {
  const session = cryptoSession.get();
  if (!session) {
    throw new Error("Crypto session not found");
  }

  const passkeys = Array.from(passkeysCollection.entries());

  console.log("session", session);
  console.log("passkeys", Array.from(passkeysCollection.entries()));
  console.log("passkeys", passkeys);

  const matchedPasskey = passkeys.find(
    ([, passkey]) => passkey.credential_id === session.credentialId,
  );

  console.log("matchedPasskey", matchedPasskey);

  if (!matchedPasskey) {
    console.log("Cached KEK's passkey not found, clearing cache");
    cryptoSession.clear();
    throw new Error("Cached passkey not found");
  }

  // Unwrap DEK with cached KEK
  const kek = base64urlDecode(session.kek);
  const dek = await unwrapDekWithKek(matchedPasskey[1].wrapped_dek, kek);

  return dek;
}
