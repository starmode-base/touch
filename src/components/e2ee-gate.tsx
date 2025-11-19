import { useE2ee } from "./hooks/e2ee";
import { E2eeEnrollment } from "./e2ee-enrollment";
import { E2eeUnlock } from "./e2ee-unlock";
import { cryptoSession } from "~/lib/e2ee-session";

export function E2eeGate(props: React.PropsWithChildren) {
  const { passkeys } = useE2ee();

  const hasPasskeys = passkeys.length > 0;

  if (!hasPasskeys) {
    return <E2eeEnrollment />;
  }

  if (!cryptoSession.exists()) {
    return <E2eeUnlock passkeys={passkeys} />;
  }

  return props.children;
}
