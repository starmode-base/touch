import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "./atoms";
import { deriveKekWithWebAuthn, unwrapDekWithKek } from "~/lib/e2ee";
import { useE2EE } from "~/lib/e2ee-context";
import { getUserPasskeysSF } from "~/server-functions/e2ee";

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

export function E2EEUnlock() {
  const { unlock } = useE2EE();
  const getUserPasskeys = useServerFn(getUserPasskeysSF);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState("");

  const handleUnlock = async () => {
    setIsUnlocking(true);
    setError("");

    try {
      // Step 1: Fetch user's passkeys from server
      const passkeys = await getUserPasskeys();

      if (passkeys.length === 0) {
        throw new Error("No passkeys found. Please enroll a passkey first.");
      }

      // Step 2: Prepare allowCredentials for WebAuthn
      const allowCredentials = passkeys.map((passkey) => ({
        id: base64urlToArrayBuffer(passkey.credentialId),
        type: "public-key" as const,
        transports: passkey.transports as AuthenticatorTransport[],
      }));

      // Step 3: Trigger WebAuthn authentication to get PRF output
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Note: We don't actually need to pass PRF input here since
      // deriveKekWithWebAuthn will call credentials.get again with PRF.
      // This first call is just to identify which credential the user selected.
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

      // Step 4: Find matching passkey by credential ID
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

      // Step 5: Derive KEK using the matched passkey's salt
      const kekSalt = hexToUint8Array(matchedPasskey.kekSalt);
      const { kek } = await deriveKekWithWebAuthn({
        kekSalt,
        origin: location.origin,
      });

      // Step 6: Unwrap DEK with KEK
      const dek = await unwrapDekWithKek(matchedPasskey.wrappedDek, kek);

      // Step 7: Store DEK in memory for this session
      unlock(dek);
    } catch (e) {
      console.error("Unlock failed:", e);
      setError((e as Error).message || "Failed to unlock encryption");
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded border border-slate-200 bg-white p-6">
      <div className="text-lg font-medium">Unlock your encrypted data</div>
      <div className="text-sm text-slate-600">
        Use your passkey to unlock your encrypted data for this session.
      </div>
      <Button onClick={handleUnlock} disabled={isUnlocking}>
        {isUnlocking ? "Unlocking..." : "Unlock with passkey"}
      </Button>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
    </div>
  );
}
