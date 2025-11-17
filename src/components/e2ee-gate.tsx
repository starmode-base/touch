import { useE2ee, useAutoUnlock } from "./hooks/e2ee";
import { E2eeEnrollment } from "./e2ee-enrollment";
import { E2eeUnlock } from "./e2ee-unlock";

export function E2eeGate(props: React.PropsWithChildren) {
  const { isDekUnlocked, passkeys } = useE2ee();
  const { triedAutoUnlock } = useAutoUnlock();

  const hasPasskeys = passkeys.length > 0;

  if (!hasPasskeys) {
    return <E2eeEnrollment />;
  }

  if (!isDekUnlocked && triedAutoUnlock) {
    return <E2eeUnlock passkeys={passkeys} />;
  }

  return props.children;
}
