import { createContext, useContext, useState, useCallback } from "react";
import {
  addPasskey as addPasskeyLib,
  unlockWithPasskey,
  type StoredPasskey,
} from "~/lib/e2ee";
import { cryptoSession, useSessionState } from "~/lib/e2ee-session";
import { useClerk } from "@clerk/tanstack-react-start";
import { contactsStore } from "~/collections/contacts";
import { useLiveQuery } from "@tanstack/react-db";
import { passkeysCollection, type Passkey } from "~/collections/passkeys";
import { genSecureToken } from "~/lib/secure-token";
import { getSessionDek } from "~/lib/e2ee-actions";

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
  isDeletingPasskey: boolean;

  // Unlock session
  unlock: (passkeys: Passkey[]) => Promise<void>;
  canUnlock: boolean;
  isUnlocking: boolean;

  // Lock session
  lock: () => Promise<void>;
  canLock: boolean;
  isLocking: boolean;

  // Sign out
  signOut: () => Promise<void>;

  // Passkeys
  passkeys: Passkey[];
}

const E2eeContext = createContext<E2eeContext | null>(null);

export function E2eeProvider(props: React.PropsWithChildren) {
  // Subscribe to session state as single source of truth
  const isSessionUnlocked = useSessionState();

  // Passkey action states
  const [isCreatingPasskey, setIsCreatingPasskey] = useState(false);
  const [isAddingPasskey, setIsAddingPasskey] = useState(false);
  const [isDeletingPasskey, setIsDeletingPasskey] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

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
    const dek = isSessionUnlocked ? await getSessionDek() : null;

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

    cryptoSession.set(result.kek, result.credentialId);
  }, [isSessionUnlocked]);

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
    setIsDeletingPasskey(true);
    // Delete from Electric collection (will sync to server via onDelete)
    passkeysCollection.delete(id);
    setIsDeletingPasskey(false);
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

    cryptoSession.set(result.kek, result.credentialId);
    contactsStore.startSync();
    setIsUnlocking(false);
  }, []);

  const lock = useCallback(async () => {
    setIsLocking(true);
    // Clear local store (encrypted and decrypted data)
    await contactsStore.clear();
    // Lock passkeys
    cryptoSession.clear();
    setIsLocking(false);
  }, []);

  const signOut = useCallback(async () => {
    await lock();
    await clerk.signOut();
  }, [clerk, lock]);

  const value: E2eeContext = {
    // Data
    passkeys,

    // Create first passkey (enrollment)
    createPasskey,
    canCreatePasskey: !hasPasskeys,
    isCreatingPasskey,

    // Add additional passkey
    addPasskey,
    canAddPasskey: hasPasskeys && isSessionUnlocked,
    isAddingPasskey,

    // Delete passkey
    deletePasskey,
    canDeletePasskey: true, // Allow deleting for now, will throw on last one
    isDeletingPasskey,

    // Unlock DEK
    unlock,
    canUnlock: hasPasskeys && !isSessionUnlocked,
    isUnlocking,

    // Lock DEK
    lock,
    canLock: isSessionUnlocked,
    isLocking,

    // Sign out
    signOut,
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
