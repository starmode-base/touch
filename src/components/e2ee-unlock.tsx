import { Button } from "./atoms";
import { useE2ee } from "./hooks/e2ee";
import type { Passkey } from "~/collections/passkeys";

export function E2eeUnlock(props: { passkeys: Passkey[] }) {
  const { signOut, unlock, isUnlocking } = useE2ee();

  return (
    <div className="flex flex-col gap-4 rounded border border-slate-200 bg-white p-6">
      <div className="text-lg font-medium">Unlock your encrypted data</div>
      <div className="text-sm text-slate-600">
        Use your passkey to unlock your encrypted data for this session.
      </div>
      <div className="flex gap-2">
        <Button onClick={() => unlock(props.passkeys)} disabled={isUnlocking}>
          {isUnlocking ? "Unlocking..." : "Unlock with passkey"}
        </Button>
        <Button onClick={signOut}>Sign out</Button>
      </div>
    </div>
  );
}
