import { useClerk } from "@clerk/tanstack-react-start";
import { usePasskeys } from "~/components/hooks/passkeys";
import { contactsStore } from "~/collections/contacts-collection";

export function useAuth() {
  const { lock } = usePasskeys();
  const clerk = useClerk();

  return {
    /** Sign out the user and lock the E2EE session */
    signOut: async () => {
      // Clear decrypted data first
      await contactsStore.clear();
      // Clear KEK cache + wipe DEK from memory
      lock();
      // Sign out from Clerk
      await clerk.signOut();
    },
  };
}
