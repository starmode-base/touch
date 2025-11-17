import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  setGlobalDek,
  clearGlobalDek,
  type CryptoBytes,
  addPasskey as addPasskeyLib,
  unlockWithPasskey,
  attemptAutoUnlock,
  hasCachedKek,
  storeCachedKek,
  clearCachedKek,
  type StoredPasskey,
} from "~/lib/e2ee";
import { useClerk } from "@clerk/tanstack-react-start";
import { contactsStore } from "~/collections/contacts";
import { useLiveQuery } from "@tanstack/react-db";
import { passkeysCollection, type Passkey } from "~/collections/passkeys";
import { genSecureToken } from "~/lib/secure-token";

/**
 * Auto-unlock hook that attempts to unlock the DEK on mount
 * Should be called once at the root of the authenticated app
 */
export function useAutoUnlock() {
  const { dek, setDek, passkeys } = useE2ee();
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

interface E2eeContext {
  /** Whether the DEK is unlocked and available in memory */
  isDekUnlocked: boolean;
  /** The DEK (only available when unlocked) */
  dek: CryptoBytes | null;
  /** Store the DEK in memory */
  setDek: (dek: CryptoBytes) => void;
  /** Wipe the DEK from memory */
  unsetDek: () => void;

  // useAuth
  lock: () => Promise<void>;
  signOut: () => Promise<void>;

  // usePasskeys
  passkeys: Passkey[];

  createPasskey: () => Promise<void>;
  canCreatePasskey: boolean;
  isCreatingPasskey: boolean;

  addPasskey: () => Promise<void>;
  canAddPasskey: boolean;
  isAddingPasskey: boolean;

  deletePasskey: (id: string) => void;
  canDeletePasskey: boolean;

  unlock: (passkeys: Passkey[]) => Promise<void>;
  canUnlock: boolean;
  isUnlocking: boolean;
  canLock: boolean;
}

const E2eeContext = createContext<E2eeContext | null>(null);

export function E2eeProvider(props: React.PropsWithChildren) {
  const [dek, setDekState] = useState<CryptoBytes | null>(null);

  // Wipe DEK on tab close or page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      setDekState(null);
      clearGlobalDek();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Wipe DEK on unmount - just in case beforeunload fires after unmount
      handleBeforeUnload();
    };
  }, []);

  /**
   * Store the DEK in memory (both React state and global module)
   */
  const setDek = useCallback((dekBytes: CryptoBytes) => {
    if (dekBytes.byteLength !== 32) {
      throw new Error("dek must be 32 bytes");
    }
    setDekState(dekBytes);
    setGlobalDek(dekBytes);
  }, []);

  /**
   * Wipe the DEK from memory (both React state and global module)
   */
  const unsetDek = useCallback(() => {
    setDekState(null);
    clearGlobalDek();
  }, []);

  // const auth = useAuth();
  // const passkeys = usePasskeys();

  const [isCreatingPasskey, setIsCreatingPasskey] = useState(false);
  const [isAddingPasskey, setIsAddingPasskey] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Query passkeys from Electric collection
  const passkeysQuery = useLiveQuery((q) =>
    q.from({ passkey: passkeysCollection }),
  );

  const passkeys = passkeysQuery.data;
  const hasPasskeys = passkeys.length > 0;
  const isDekUnlocked = dek !== null;

  // Core passkey creation logic
  const createPasskeyInternal = useCallback(async () => {
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
  }, [dek, setDek]);

  // Create first passkey (enrollment)
  const createPasskey = useCallback(async () => {
    setIsCreatingPasskey(true);
    await createPasskeyInternal();
    setIsCreatingPasskey(false);
  }, [createPasskeyInternal]);

  // Add additional passkey
  const addPasskey = useCallback(async () => {
    setIsAddingPasskey(true);
    await createPasskeyInternal();
    setIsAddingPasskey(false);
  }, [createPasskeyInternal]);

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
  const lock2 = () => {
    clearCachedKek();
    unsetDek();
  };

  const clerk = useClerk();

  const value: E2eeContext = {
    isDekUnlocked: dek !== null,
    dek,
    setDek,
    unsetDek,

    // Data
    passkeys,

    // Create first passkey (enrollment)
    createPasskey,
    canCreatePasskey: !hasPasskeys,
    isCreatingPasskey,

    // Add additional passkey
    addPasskey,
    canAddPasskey: hasPasskeys && isDekUnlocked,
    isAddingPasskey,

    // Delete passkey
    deletePasskey,
    canDeletePasskey: true, // Allow deleting for now, will throw on last one

    // Unlock
    unlock,
    canUnlock: hasPasskeys && !isDekUnlocked,
    isUnlocking,

    canLock: isDekUnlocked,

    //
    //
    lock: async () => {
      // Clear local store (encrypted and decrypted data)
      await contactsStore.clear();
      // Lock passkeys
      clearCachedKek();
      unsetDek();
    },

    /** Sign out and clear everything */
    signOut: async () => {
      // Clear local store (encrypted and decrypted data)
      await contactsStore.clear();
      // Lock passkeys
      lock2();
      // Sign out from Clerk
      await clerk.signOut();
    },
  };

  return (
    <E2eeContext.Provider value={value}>{props.children}</E2eeContext.Provider>
  );
}

export function useE2ee() {
  const context = useContext(E2eeContext);

  if (!context) {
    throw new Error("useE2ee must be used within E2eeProvider");
  }

  return context;
}
