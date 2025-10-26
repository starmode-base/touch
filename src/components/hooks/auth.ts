import { useClerk } from "@clerk/tanstack-react-start";
import { usePasskeys } from "~/components/hooks/passkeys";
import { contactsStore } from "~/collections/contacts-collection";

/**
 * High-level auth orchestration hook
 *
 * Provides orchestrated operations that coordinate multiple cleanup actions.
 * For passkey-specific operations (enroll, unlock, etc), use usePasskeys directly.
 */
export function useAuth() {
  const passkeys = usePasskeys();
  const clerk = useClerk();

  return {
    /** Lock E2EE session and clear all encrypted data */
    lock: async () => {
      // Clear local store (encrypted and decrypted data)
      await contactsStore.clear();
      // Lock passkeys
      passkeys.lock();
    },

    /** Sign out and clear everything */
    signOut: async () => {
      // Clear local store (encrypted and decrypted data)
      await contactsStore.clear();
      // Lock passkeys
      passkeys.lock();
      // Sign out from Clerk
      await clerk.signOut();
    },
  };
}
