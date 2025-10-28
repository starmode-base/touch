import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useCallback } from "react";
import { useE2ee } from "./e2ee";
import { getUserPasskeysSF, storePasskeySF } from "~/server-functions/passkeys";
import {
  enrollPasskey,
  addAdditionalPasskey,
  unlockWithPasskey,
  attemptAutoUnlock,
  hasCachedKek,
  storeCachedKek,
  clearCachedKek,
} from "~/lib/e2ee";

interface UsePasskeysReturn {
  // Operations
  enroll: () => Promise<void>;
  addPasskey: () => Promise<void>;
  unlock: () => Promise<void>;
  lock: () => void;

  // Status checking
  hasPasskeys: boolean | null;
  isCheckingPasskeys: boolean;
  refreshPasskeys: () => Promise<void>;

  // Auto-unlock
  tryAutoUnlock: () => Promise<void>;
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

  // States for unlock
  isUnlocking: boolean;
  unlockError: string;
  resetUnlockState: () => void;
}

export function usePasskeys(): UsePasskeysReturn {
  const { isDekUnlocked, setDek, unsetDek, dek } = useE2ee();
  const getUserPasskeys = useServerFn(getUserPasskeysSF);
  const storePasskey = useServerFn(storePasskeySF);

  // Passkey status
  const [hasPasskeys, setHasPasskeys] = useState<boolean | null>(null);
  const [isCheckingPasskeys, setIsCheckingPasskeys] = useState(true);

  // Enroll states
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [enrollSuccess, setEnrollSuccess] = useState("");

  // Add states
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  // Unlock states
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");

  // Auto-unlock state
  const [triedAutoUnlock, setTriedAutoUnlock] = useState(false);

  // Check if user has passkeys
  const refreshPasskeys = useCallback(async () => {
    setIsCheckingPasskeys(true);
    const passkeys = await getUserPasskeys();
    setHasPasskeys(passkeys.length > 0);
    setIsCheckingPasskeys(false);
  }, [getUserPasskeys]);

  useEffect(() => {
    void refreshPasskeys();
  }, [refreshPasskeys]);

  // Auto-unlock on mount if passkeys exist
  const tryAutoUnlock = useCallback(async () => {
    // Only attempt auto-unlock if there's a cached KEK
    if (!hasCachedKek()) {
      setTriedAutoUnlock(true);
      return;
    }

    try {
      const passkeys = await getUserPasskeys();
      const dekBytes = await attemptAutoUnlock(passkeys);

      setDek(dekBytes);
    } catch (error) {
      console.log("Cached KEK unlock failed, showing manual unlock:", error);
    } finally {
      setTriedAutoUnlock(true);
    }
  }, [getUserPasskeys, setDek]);

  useEffect(() => {
    if (hasPasskeys && !isDekUnlocked && !triedAutoUnlock) {
      void tryAutoUnlock();
    }
  }, [hasPasskeys, isDekUnlocked, triedAutoUnlock, tryAutoUnlock]);

  // Enroll operation
  const enroll = useCallback(async () => {
    setIsEnrolling(true);
    setEnrollError("");
    setEnrollSuccess("");

    try {
      const result = await enrollPasskey({
        rpId: location.hostname,
        rpName: "Touch",
        userDisplayName: "Touch Encryption Key",
        origin: location.origin,
      });

      await storePasskey({
        data: {
          credentialId: result.credentialId,
          publicKey: result.publicKey,
          wrappedDek: result.wrappedDek,
          kekSalt: result.kekSalt,
          transports: result.transports,
          algorithm: result.algorithm,
        },
      });

      storeCachedKek(result.kek, result.credentialId);
      setDek(result.dek);
      setEnrollSuccess("Encryption enabled successfully!");
      await refreshPasskeys();
    } catch (e) {
      console.error("Enrollment failed:", e);
      setEnrollError((e as Error).message || "Failed to enable encryption");
    } finally {
      setIsEnrolling(false);
    }
  }, [storePasskey, setDek, refreshPasskeys]);

  // Add passkey operation
  const addPasskey = useCallback(async () => {
    if (!dek) {
      setAddError("DEK not unlocked");
      return;
    }

    setIsAdding(true);
    setAddError("");
    setAddSuccess("");

    try {
      const result = await addAdditionalPasskey({
        dek,
        rpId: location.hostname,
        rpName: "Touch",
        userDisplayName: "Touch Encryption Key (Additional)",
        origin: location.origin,
      });

      await storePasskey({
        data: {
          credentialId: result.credentialId,
          publicKey: result.publicKey,
          wrappedDek: result.wrappedDek,
          kekSalt: result.kekSalt,
          transports: result.transports,
          algorithm: result.algorithm,
        },
      });

      storeCachedKek(result.kek, result.credentialId);
      setAddSuccess("Additional passkey added successfully!");
      await refreshPasskeys();
    } catch (e) {
      console.error("Add passkey failed:", e);
      setAddError((e as Error).message || "Failed to add passkey");
    } finally {
      setIsAdding(false);
    }
  }, [dek, storePasskey, refreshPasskeys]);

  // Unlock operation
  const unlock = useCallback(async () => {
    setIsUnlocking(true);
    setUnlockError("");

    try {
      const passkeys = await getUserPasskeys();
      const result = await unlockWithPasskey({
        passkeys,
        origin: location.origin,
      });

      storeCachedKek(result.kek, result.credentialId);
      setDek(result.dek);
    } catch (e) {
      console.error("Unlock failed:", e);
      setUnlockError((e as Error).message || "Failed to unlock encryption");
    } finally {
      setIsUnlocking(false);
    }
  }, [getUserPasskeys, setDek]);

  // Lock operation (clear KEK cache + wipe DEK from memory)
  const lock = useCallback(() => {
    clearCachedKek();
    unsetDek();
  }, [unsetDek]);

  return {
    // Operations
    enroll,
    addPasskey,
    unlock,
    /** Lock operation (clear KEK cache + wipe DEK from memory) */
    lock,

    // Status
    hasPasskeys,
    isCheckingPasskeys,
    refreshPasskeys,

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

    // Unlock states
    isUnlocking,
    unlockError,
    resetUnlockState: () => {
      setUnlockError("");
    },
  };
}
