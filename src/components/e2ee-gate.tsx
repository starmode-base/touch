import { useEffect } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { useE2ee } from "./hooks/e2ee";
import { usePasskeys } from "./hooks/passkeys";
import { E2eeEnrollment } from "./e2ee-enrollment";
import { E2eeUnlock } from "./e2ee-unlock";
import { passkeysCollection } from "~/collections/passkeys";

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

  if (!hasPasskeys) {
    return <E2eeEnrollment />;
  }

  if (!isDekUnlocked && triedAutoUnlock) {
    return <E2eeUnlock passkeys={passkeysQuery.data} />;
  }

  return props.children;
}
