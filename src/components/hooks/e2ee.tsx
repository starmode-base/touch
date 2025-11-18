import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useSyncExternalStore,
} from "react";
import {
  setGlobalDek,
  clearGlobalDek,
  getGlobalDek,
  hasGlobalDek,
  subscribeToDekState,
  addPasskey as addPasskeyLib,
  unlockWithPasskey,
  attemptAutoUnlock,
  type StoredPasskey,
} from "~/lib/e2ee";
import {
  hasCryptoSession,
  setCryptoSession,
  clearCryptoSession,
  getCryptoSession,
} from "~/lib/e2ee-kek-cache";
import { useClerk } from "@clerk/tanstack-react-start";
import { contactsStore } from "~/collections/contacts";
import { useLiveQuery } from "@tanstack/react-db";
import { passkeysCollection, type Passkey } from "~/collections/passkeys";
import { genSecureToken } from "~/lib/secure-token";

interface E2eeContext {
  // Create passkey (enrollment)
  createPasskey: () => Promise<void>;
  canCreatePasskey: boolean;
  isCreatingPasskey: boolean;

  // Add passkey (additional passkey)
  addPasskey: () => Promise<void>;
  canAddPasskey: boolean;
  isAddingPasskey: boolean;

  // Delete passkey
  deletePasskey: (id: string) => void;
  canDeletePasskey: boolean;

  // Unlock DEK
  unlock: (passkeys: Passkey[]) => Promise<void>;
  canUnlock: boolean;
  isUnlocking: boolean;

  // Lock DEK
  lock: () => Promise<void>;
  canLock: boolean;

  // DEK
  isDekUnlocked: boolean;

  // Sign out
  signOut: () => Promise<void>;

  // Passkeys
  passkeys: Passkey[];
  triedAutoUnlock: boolean;
}

const E2eeContext = createContext<E2eeContext | null>(null);

export function E2eeProvider(props: React.PropsWithChildren) {
  // Subscribe to global DEK state as single source of truth
  const isDekUnlocked = useSyncExternalStore(
    subscribeToDekState,
    hasGlobalDek,
    () => false, // Server snapshot - DEK never unlocked on server
  );

  const [isCreatingPasskey, setIsCreatingPasskey] = useState(false);
  const [isAddingPasskey, setIsAddingPasskey] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [triedAutoUnlock, setTriedAutoUnlock] = useState(false);

  // Passkeys
  const passkeysQuery = useLiveQuery((q) =>
    q.from({ passkey: passkeysCollection }),
  );

  const passkeys = passkeysQuery.data;
  const hasPasskeys = passkeys.length > 0;

  // Clerk
  const clerk = useClerk();

  // Core passkey creation logic
  const createPasskeyInternal = useCallback(async () => {
    const dek = isDekUnlocked ? getGlobalDek() : null;

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

    setCryptoSession(result.kek, result.credentialId);
    setGlobalDek(result.dek);
  }, [isDekUnlocked]);

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
  const unlock = useCallback(async (passkeys: Passkey[]) => {
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

    setCryptoSession(result.kek, result.credentialId);
    setGlobalDek(result.dek);
    setIsUnlocking(false);
  }, []);

  const lock = async () => {
    // Clear local store (encrypted and decrypted data)
    await contactsStore.clear();
    // Lock passkeys
    clearCryptoSession();
    clearGlobalDek();
  };

  // Wipe DEK on tab close or page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      clearGlobalDek();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      handleBeforeUnload();
    };
  }, []);

  /**
   * Auto-unlock hook that attempts to unlock the DEK on mount
   */
  useEffect(() => {
    if (hasPasskeys && !isDekUnlocked && !triedAutoUnlock) {
      if (hasCryptoSession()) {
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
            storeKek: setCryptoSession,
            clearKek: clearCryptoSession,
            kekObj: getCryptoSession(),
          });

          setGlobalDek(dekBytes);
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
  }, [hasPasskeys, isDekUnlocked, triedAutoUnlock, passkeys]);

  const value: E2eeContext = {
    isDekUnlocked,

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

    // Unlock DEK
    unlock,
    canUnlock: hasPasskeys && !isDekUnlocked,
    isUnlocking,

    // Lock DEK
    lock,
    canLock: isDekUnlocked,

    // Sign out
    signOut: async () => {
      await lock();
      await clerk.signOut();
    },

    // Tried auto-unlock
    triedAutoUnlock,
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
