import { Button } from "./atoms";
import { usePasskeys } from "./hooks/passkeys";

export function E2eeUnlock() {
  const { unlock, isUnlocking, unlockError } = usePasskeys();

  return (
    <div className="flex flex-col gap-4 rounded border border-slate-200 bg-white p-6">
      <div className="text-lg font-medium">Unlock your encrypted data</div>
      <div className="text-sm text-slate-600">
        Use your passkey to unlock your encrypted data for this session.
      </div>
      <Button onClick={unlock} disabled={isUnlocking}>
        {isUnlocking ? "Unlocking..." : "Unlock with passkey"}
      </Button>
      {unlockError ? (
        <div className="text-sm text-red-600">{unlockError}</div>
      ) : null}
    </div>
  );
}
