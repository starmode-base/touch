import { useE2ee } from "./hooks/e2ee";
import { usePasskeys } from "./hooks/passkeys";
import { E2eeEnrollment } from "./e2ee-enrollment";
import { E2eeUnlock } from "./e2ee-unlock";

/**
 * E2EEGate component that orchestrates the E2EE flow
 *
 * - If user has no passkeys: Show enrollment
 * - If user has passkeys but DEK is locked: Try silent unlock (cached KEK), fallback to unlock screen
 * - If DEK is unlocked: Show the app
 */
export function E2eeGate(props: React.PropsWithChildren) {
  const { isDekUnlocked } = useE2ee();
  const { hasPasskeys, isCheckingPasskeys, triedAutoUnlock } = usePasskeys();

  // Loading state
  if (isCheckingPasskeys) {
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
        <E2eeEnrollment />
      </div>
    );
  }

  // Has passkeys but DEK is locked: Show unlock screen (after trying auto-unlock)
  if (!isDekUnlocked) {
    // Still trying auto-unlock, show loading state
    if (!triedAutoUnlock) {
      return (
        <div className="m-auto">
          <div className="text-slate-600">Loading...</div>
        </div>
      );
    }

    // Auto-unlock failed or no cached KEK, show manual unlock
    return (
      <div className="m-auto max-w-md">
        <E2eeUnlock />
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
