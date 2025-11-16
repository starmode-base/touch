import { useState, useCallback, useEffect } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { useE2ee } from "./e2ee";
import { passkeysCollection, type Passkey } from "~/collections/passkeys";
import {
  addPasskey as addPasskeyLib,
  unlockWithPasskey,
  attemptAutoUnlock,
  hasCachedKek,
  storeCachedKek,
  clearCachedKek,
  type StoredPasskey,
} from "~/lib/e2ee";
import { genSecureToken } from "~/lib/secure-token";

/**
 * Auto-unlock hook that attempts to unlock the DEK on mount
 * Should be called once at the root of the authenticated app
 */
export function useAutoUnlock() {
  const { dek, setDek } = useE2ee();
  const { passkeys } = usePasskeys();
  const [triedAutoUnlock, setTriedAutoUnlock] = useState(false);

  const hasPasskeys = passkeys.length > 0;

  useEffect(() => {
    if (hasPasskeys && !dek && !triedAutoUnlock) {
      if (hasCachedKek()) {
        const tryUnlock = async () => {
          // Convert to StoredPasskey format
          const storedPasskeys: StoredPasskey[] = passkeys.map((p) => ({
            credentialId: p.credential_id,
            wrappedDek: p.wrapped_dek,
            kekSalt: p.kek_salt,
            transports: p.transports,
            createdAt: p.created_at,
          }));

          const dekBytes = await attemptAutoUnlock({
            passkeys: storedPasskeys,
            rpId: location.hostname,
          });

          setDek(dekBytes);
          setTriedAutoUnlock(true);
        };

        void tryUnlock();
      } else {
        // No cached KEK, can't auto-unlock
        void Promise.resolve().then(() => {
          setTriedAutoUnlock(true);
        });
      }
    }
  }, [hasPasskeys, dek, triedAutoUnlock, passkeys, setDek]);

  return { triedAutoUnlock };
}

export function usePasskeys() {
  const { setDek, unsetDek, dek } = useE2ee();
  const [isAdding, setIsAdding] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Query passkeys from Electric collection
  const passkeysQuery = useLiveQuery((q) =>
    q.from({ passkey: passkeysCollection }),
  );

  const passkeys = passkeysQuery.data;

  // Add passkey operation
  // Pass null for first passkey (generates new DEK), pass existing DEK for additional passkeys
  const addPasskey = useCallback(async () => {
    setIsAdding(true);

    const result = await addPasskeyLib({
      dek,
      rpId: location.hostname,
      rpName: "Touch",
      userDisplayName: "Touch Encryption Key",
      userName: "e2ee-" + new Date().toISOString(),
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

    storeCachedKek(result.kek, result.credentialId);
    setDek(result.dek);
    setIsAdding(false);
  }, [dek, setDek]);

  // Delete passkey operation
  const deletePasskey = useCallback((id: string) => {
    // Delete from Electric collection (will sync to server via onDelete)
    passkeysCollection.delete(id);
  }, []);

  // Unlock operation
  const unlock = useCallback(
    async (passkeys: Passkey[]) => {
      setIsUnlocking(true);

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

      storeCachedKek(result.kek, result.credentialId);
      setDek(result.dek);
      setIsUnlocking(false);
    },
    [setDek],
  );

  // Lock operation (clear KEK cache + wipe DEK from memory)
  const lock = useCallback(() => {
    clearCachedKek();
    unsetDek();
  }, [unsetDek]);

  return {
    // Data
    passkeys,

    // Operations
    addPasskey,
    deletePasskey,
    unlock,
    /** Lock operation (clear KEK cache + wipe DEK from memory) */
    lock,

    // States
    isAdding,
    isUnlocking,
  };
}
