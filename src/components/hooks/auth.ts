import { useClerk } from "@clerk/tanstack-react-start";
import { usePasskeys } from "~/components/hooks/passkeys";

export function useAuth() {
  const { lock } = usePasskeys();
  const clerk = useClerk();

  return {
    /** Sign out the user and lock the E2EE session */
    signOut: async () => {
      lock();
      await clerk.signOut();
    },
  };
}
