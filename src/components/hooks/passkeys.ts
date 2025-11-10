import { useState, useCallback } from "react";
import { useE2ee } from "./e2ee";
import { passkeysCollection, type Passkey } from "~/collections/passkeys";
import {
  enrollPasskey,
  addAdditionalPasskey,
  unlockWithPasskey,
  attemptAutoUnlock,
  hasCachedKek,
  storeCachedKek,
  clearCachedKek,
  type StoredPasskey,
} from "~/lib/e2ee";

interface UsePasskeysReturn {
  // Operations
  enroll: () => Promise<void>;
  addPasskey: () => Promise<void>;
  deletePasskey: (credentialId: string) => void;
  unlock: (passkeys: Passkey[]) => Promise<void>;
  unlockWithSpecificPasskey: (passkey: Passkey) => Promise<void>;
  lock: () => void;

  // Auto-unlock
  tryAutoUnlock: (passkeys: Passkey[]) => Promise<void>;
  triedAutoUnlock: boolean;

  // States for enroll
  isEnrolling: boolean;
  enrollError: string;
  enrollSuccess: string;
  resetEnrollState: () => void;

  // States for add
  isAdding: boolean;
  addError: string;
  addSuccess: string;
  resetAddState: () => void;

  // States for delete
  isDeleting: boolean;
  deleteError: string;
  deleteSuccess: string;
  resetDeleteState: () => void;

  // States for unlock
  isUnlocking: boolean;
  unlockError: string;
  resetUnlockState: () => void;
}

export function usePasskeys(): UsePasskeysReturn {
  const { setDek, unsetDek, dek } = useE2ee();

  // Enroll states
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [enrollSuccess, setEnrollSuccess] = useState("");

  // Add states
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  // Delete states
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

  // Unlock states
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");

  // Auto-unlock state
  const [triedAutoUnlock, setTriedAutoUnlock] = useState(false);

  // Auto-unlock on mount if passkeys exist
  const tryAutoUnlock = useCallback(
    async (passkeys: Passkey[]) => {
      // Only attempt auto-unlock if there's a cached KEK
      if (!hasCachedKek()) {
        setTriedAutoUnlock(true);
        return;
      }

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
    },
    [setDek],
  );

  // Enroll operation
  const enroll = useCallback(async () => {
    setIsEnrolling(true);
    setEnrollError("");
    setEnrollSuccess("");

    const result = await enrollPasskey({
      rpId: location.hostname,
      rpName: "Touch",
      userDisplayName: "Touch Encryption Key",
      userName: "e2ee-" + new Date().toISOString(),
    });

    // Insert into Electric collection (will sync to server via onInsert)
    passkeysCollection.insert({
      id: result.credentialId,
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
    setEnrollSuccess("Encryption enabled successfully!");
    setIsEnrolling(false);
  }, [setDek]);

  // Add passkey operation
  const addPasskey = useCallback(async () => {
    if (!dek) {
      throw new Error("DEK must be unlocked to add a passkey");
    }

    setIsAdding(true);
    setAddError("");
    setAddSuccess("");

    const result = await addAdditionalPasskey({
      dek,
      rpId: location.hostname,
      rpName: "Touch",
      userDisplayName: "Touch Encryption Key (Additional)",
      userName: "e2ee-" + new Date().toISOString(),
    });

    // Insert into Electric collection (will sync to server via onInsert)
    passkeysCollection.insert({
      id: result.credentialId,
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
    setAddSuccess("Additional passkey added successfully!");
    setIsAdding(false);
  }, [dek]);

  // Delete passkey operation
  const deletePasskey = useCallback((credentialId: string) => {
    setIsDeleting(true);
    setDeleteError("");
    setDeleteSuccess("");

    try {
      // Delete from Electric collection (will sync to server via onDelete)
      passkeysCollection.delete(credentialId);
      setDeleteSuccess("Passkey deleted successfully!");
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setIsDeleting(false);
    }
  }, []);

  // Unlock operation
  const unlock = useCallback(
    async (passkeys: Passkey[]) => {
      setIsUnlocking(true);
      setUnlockError("");

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

  // Unlock with specific passkey operation
  const unlockWithSpecificPasskey = useCallback(
    async (passkey: Passkey) => {
      setIsUnlocking(true);
      setUnlockError("");

      // Convert to StoredPasskey format
      const storedPasskey: StoredPasskey = {
        credentialId: passkey.credential_id,
        wrappedDek: passkey.wrapped_dek,
        kekSalt: passkey.kek_salt,
        transports: passkey.transports,
      };

      const result = await unlockWithPasskey({
        passkeys: [storedPasskey],
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
    // Operations
    enroll,
    addPasskey,
    deletePasskey,
    unlock,
    unlockWithSpecificPasskey,
    /** Lock operation (clear KEK cache + wipe DEK from memory) */
    lock,

    // Auto-unlock
    tryAutoUnlock,
    triedAutoUnlock,

    // Enroll states
    isEnrolling,
    enrollError,
    enrollSuccess,
    resetEnrollState: () => {
      setEnrollError("");
      setEnrollSuccess("");
    },

    // Add states
    isAdding,
    addError,
    addSuccess,
    resetAddState: () => {
      setAddError("");
      setAddSuccess("");
    },

    // Delete states
    isDeleting,
    deleteError,
    deleteSuccess,
    resetDeleteState: () => {
      setDeleteError("");
      setDeleteSuccess("");
    },

    // Unlock states
    isUnlocking,
    unlockError,
    resetUnlockState: () => {
      setUnlockError("");
    },
  };
}
