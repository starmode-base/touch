import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useE2EE } from "~/components/e2ee-context";
import { getUserPasskeysSF } from "~/server-functions/e2ee";
import { E2EEEnrollment } from "./e2ee-enrollment";
import { E2EEUnlock } from "./e2ee-unlock";

/**
 * E2EEGate component that orchestrates the E2EE flow
 *
 * - If user has no passkeys: Show enrollment
 * - If user has passkeys but DEK is locked: Show unlock screen
 * - If DEK is unlocked: Show the app
 */
export function E2EEGate(props: React.PropsWithChildren) {
  const { isDekUnlocked } = useE2EE();
  const getUserPasskeys = useServerFn(getUserPasskeysSF);
  const [hasPasskeys, setHasPasskeys] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user has passkeys
  useEffect(() => {
    const checkPasskeys = async () => {
      const passkeys = await getUserPasskeys();
      setHasPasskeys(passkeys.length > 0);
      setIsLoading(false);
    };

    void checkPasskeys();
  }, [getUserPasskeys]);

  // Loading state
  if (isLoading) {
    return (
      <div className="m-auto">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  // No passkeys: Show enrollment
  if (!hasPasskeys) {
    return (
      <div className="m-auto max-w-md">
        <E2EEEnrollment />
      </div>
    );
  }

  // Has passkeys but DEK is locked: Show unlock screen
  if (!isDekUnlocked) {
    return (
      <div className="m-auto max-w-md">
        <E2EEUnlock />
      </div>
    );
  }

  // DEK is unlocked: Show the app with option to add more passkeys
  return (
    <>
      {props.children}
      {/* You can show the "Add another passkey" option somewhere in the app */}
    </>
  );
}
