import { createContext, useContext, useState, useCallback } from "react";
import { useSessionState } from "~/lib/e2ee-session";
import { useClerk } from "@clerk/tanstack-react-start";
import { useLiveQuery } from "@tanstack/react-db";
import { passkeysCollection, type Passkey } from "~/collections/passkeys";
import {
  addPasskeyAction,
  createPasskeyAction,
  deletePasskeyAction,
  lockAction,
  unlockAction,
} from "~/lib/e2ee-actions";

interface E2eeContext {
  // Create first passkey (enrollment)
  createPasskey: () => Promise<void>;
  canCreatePasskey: boolean;
  isCreatingPasskey: boolean;

  // Add additional passkey
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

  // Session state
  isSessionUnlocked: boolean;

  // Data
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

  // Create first passkey (enrollment)
  const createPasskey = useCallback(async () => {
    setIsCreatingPasskey(true);
    await createPasskeyAction();
    setIsCreatingPasskey(false);
  }, []);

  // Add additional passkey
  const addPasskey = useCallback(async () => {
    setIsAddingPasskey(true);
    await addPasskeyAction();
    setIsAddingPasskey(false);
  }, []);

  // Delete passkey operation
  const deletePasskey = useCallback((id: string) => {
    setIsDeletingPasskey(true);
    deletePasskeyAction(id);
    setIsDeletingPasskey(false);
  }, []);

  // Unlock operation
  const unlock = useCallback(async (passkeys: Passkey[]) => {
    setIsUnlocking(true);
    await unlockAction(passkeys);
    setIsUnlocking(false);
  }, []);

  const lock = useCallback(async () => {
    setIsLocking(true);
    await lockAction();
    setIsLocking(false);
  }, []);

  const signOut = useCallback(async () => {
    await lock();
    await clerk.signOut();
  }, [clerk, lock]);

  const value: E2eeContext = {
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

    // Unlock session
    unlock,
    canUnlock: hasPasskeys && !isSessionUnlocked,
    isUnlocking,

    // Lock session
    lock,
    canLock: isSessionUnlocked,
    isLocking,

    // Sign out
    signOut,

    // Session state
    isSessionUnlocked,

    // Data
    passkeys,
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
