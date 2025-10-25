import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "./atoms";
import {
  createPrfPasskey,
  deriveKekWithWebAuthn,
  generateDek,
  generateKekSalt,
  wrapDekWithKek,
  toHex,
  storeCachedKek,
} from "~/lib/e2ee";
import { useE2EE } from "~/components/e2ee-context";
import { storePasskeySF } from "~/server-functions/e2ee";

export function E2EEEnrollment() {
  const { unlock } = useE2EE();
  const storePasskey = useServerFn(storePasskeySF);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleEnroll = async () => {
    setIsEnrolling(true);
    setError("");
    setSuccess("");

    try {
      // Step 1: Create PRF-enabled passkey
      const passkeyResult = await createPrfPasskey({
        rpId: location.hostname,
        rpName: "Touch",
        userDisplayName: "Touch Encryption Key",
      });

      // Step 2: Generate KEK salt (will be stored with passkey)
      const kekSalt = generateKekSalt(32);

      // Step 3: Derive KEK from passkey's PRF output
      const { kek } = await deriveKekWithWebAuthn({
        kekSalt,
        origin: location.origin,
      });

      // Step 4: Generate random DEK
      const dek = generateDek();

      // Step 5: Wrap DEK with KEK
      const wrappedDek = await wrapDekWithKek(dek, kek);

      // Step 6: Store passkey details on server
      await storePasskey({
        data: {
          credentialId: passkeyResult.credentialId,
          publicKey: passkeyResult.publicKey,
          wrappedDek,
          kekSalt: toHex(kekSalt),
          transports: passkeyResult.transports,
          algorithm: passkeyResult.algorithm.toString(),
        },
      });

      // Step 7: Cache KEK for future reloads in this session
      storeCachedKek(kek, passkeyResult.credentialId, toHex(kekSalt));

      // Step 8: Unlock the DEK in memory for this session
      unlock(dek);

      setSuccess("Encryption enabled successfully!");
    } catch (e) {
      console.error("Enrollment failed:", e);
      setError((e as Error).message || "Failed to enable encryption");
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded border border-slate-200 bg-white p-6">
      <div className="text-lg font-medium">Enable encryption</div>
      <div className="text-sm text-slate-600">
        Protect your data with end-to-end encryption using a passkey. Your data
        will be encrypted on your device before being sent to the server.
      </div>
      <Button onClick={handleEnroll} disabled={isEnrolling}>
        {isEnrolling ? "Setting up..." : "Enable encryption"}
      </Button>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {success ? <div className="text-sm text-green-600">{success}</div> : null}
    </div>
  );
}

export function E2EEAddPasskey() {
  const { dek } = useE2EE();
  const storePasskey = useServerFn(storePasskeySF);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleAddPasskey = async () => {
    if (!dek) {
      setError("DEK not unlocked");
      return;
    }

    setIsAdding(true);
    setError("");
    setSuccess("");

    try {
      // Step 1: Create new PRF-enabled passkey
      const passkeyResult = await createPrfPasskey({
        rpId: location.hostname,
        rpName: "Touch",
        userDisplayName: "Touch Encryption Key (Additional)",
      });

      // Step 2: Generate new KEK salt for this passkey
      const kekSalt = generateKekSalt(32);

      // Step 3: Derive KEK from new passkey's PRF output
      const { kek } = await deriveKekWithWebAuthn({
        kekSalt,
        origin: location.origin,
      });

      // Step 4: Wrap existing DEK with new KEK
      const wrappedDek = await wrapDekWithKek(dek, kek);

      // Step 5: Store new passkey details on server
      await storePasskey({
        data: {
          credentialId: passkeyResult.credentialId,
          publicKey: passkeyResult.publicKey,
          wrappedDek,
          kekSalt: toHex(kekSalt),
          transports: passkeyResult.transports,
          algorithm: passkeyResult.algorithm.toString(),
        },
      });

      // Step 6: Cache the new KEK (in case user uses this passkey next time)
      storeCachedKek(kek, passkeyResult.credentialId, toHex(kekSalt));

      setSuccess("Additional passkey added successfully!");
    } catch (e) {
      console.error("Add passkey failed:", e);
      setError((e as Error).message || "Failed to add passkey");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm text-slate-600">
        Add another passkey to access your encrypted data from multiple devices.
      </div>
      <Button onClick={handleAddPasskey} disabled={isAdding}>
        {isAdding ? "Adding..." : "Add another passkey"}
      </Button>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {success ? <div className="text-sm text-green-600">{success}</div> : null}
    </div>
  );
}
