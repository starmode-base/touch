import { useE2ee } from "./hooks/e2ee";
import { E2eeEnrollment } from "./e2ee-enrollment";

export function E2eeGate(props: React.PropsWithChildren) {
  const { passkeys } = useE2ee();

  const hasPasskeys = passkeys.length > 0;

  if (!hasPasskeys) {
    return <E2eeEnrollment />;
  }

  return props.children;
}
