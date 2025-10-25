import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useE2EE } from "~/lib/e2ee-context";
import { getUserPasskeysSF } from "~/server-functions/e2ee";
import { attemptAutoUnlock } from "~/lib/e2ee";
import { E2EEEnrollment } from "./e2ee-enrollment";
import { E2EEUnlock } from "./e2ee-unlock";

/**
 * E2EEGate component that orchestrates the E2EE flow
 *
 * - If user has no passkeys: Show enrollment
 * - If user has passkeys but DEK is locked: Automatically attempt unlock
 * - If DEK is unlocked: Show the app
 */
export function E2EEGate(props: React.PropsWithChildren) {
  const { isDekUnlocked, unlock } = useE2EE();
  const getUserPasskeys = useServerFn(getUserPasskeysSF);
  const [hasPasskeys, setHasPasskeys] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Check if user has passkeys
  useEffect(() => {
    const checkPasskeys = async () => {
      const passkeys = await getUserPasskeys();
      setHasPasskeys(passkeys.length > 0);
      setIsLoading(false);
    };

    void checkPasskeys();
  }, [getUserPasskeys]);

  // Auto-unlock DEK when passkeys exist but DEK is locked
  useEffect(() => {
    if (hasPasskeys && !isDekUnlocked) {
      const autoUnlock = async () => {
        try {
          setUnlockError(null);
          const passkeys = await getUserPasskeys();
          const dek = await attemptAutoUnlock(passkeys);
          unlock(dek);
        } catch (error) {
          console.error("Auto-unlock failed:", error);
          setUnlockError((error as Error).message || "Failed to unlock");
        }
      };

      void autoUnlock();
    }
  }, [hasPasskeys, isDekUnlocked, getUserPasskeys, unlock]);

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

  // Has passkeys but DEK is locked: Show unlock or auto-unlocking state
  if (!isDekUnlocked) {
    if (unlockError) {
      // Auto-unlock failed, show manual unlock UI
      return (
        <div className="m-auto max-w-md">
          <E2EEUnlock />
        </div>
      );
    }

    // Auto-unlocking in progress
    return (
      <div className="m-auto">
        <div className="text-slate-600">Unlocking...</div>
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
