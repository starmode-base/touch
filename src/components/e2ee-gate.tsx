import { useEffect } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { useE2ee } from "./hooks/e2ee";
import { usePasskeys } from "./hooks/passkeys";
import { E2eeEnrollment } from "./e2ee-enrollment";
import { E2eeUnlock } from "./e2ee-unlock";
import { passkeysCollection } from "~/collections/passkeys-collection";

/**
 * E2EEGate component that orchestrates the E2EE flow
 *
 * Strategy:
 * - Always render children (let app/collections load independently)
 * - Show overlay for enrollment/unlock when needed
 * - Collections start empty and populate as they sync
 */
export function E2eeGate(props: React.PropsWithChildren) {
  const { isDekUnlocked } = useE2ee();
  const { tryAutoUnlock, triedAutoUnlock } = usePasskeys();

  // Query passkeys from Electric collection
  const passkeysQuery = useLiveQuery((q) =>
    q.from({ passkey: passkeysCollection }),
  );

  const hasPasskeys = passkeysQuery.data.length > 0;

  // Auto-unlock when passkeys are loaded and not already unlocked
  useEffect(() => {
    if (hasPasskeys && !isDekUnlocked && !triedAutoUnlock) {
      void tryAutoUnlock(passkeysQuery.data);
    }
  }, [
    hasPasskeys,
    isDekUnlocked,
    triedAutoUnlock,
    tryAutoUnlock,
    passkeysQuery.data,
  ]);

  // Always render children (app loads independently)
  // Show enrollment/unlock as overlays when needed
  return (
    <>
      {props.children}

      {/* Enrollment overlay - only show after we know user has no passkeys */}
      {!hasPasskeys && passkeysQuery.data.length === 0 ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="max-w-md">
            <E2eeEnrollment />
          </div>
        </div>
      ) : null}

      {/* Unlock overlay - show after auto-unlock tried and failed */}
      {hasPasskeys && !isDekUnlocked && triedAutoUnlock ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="max-w-md">
            <E2eeUnlock passkeys={passkeysQuery.data} />
          </div>
        </div>
      ) : null}
    </>
  );
}
