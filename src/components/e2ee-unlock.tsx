import { Button } from "./atoms";
import { usePasskeys } from "./hooks/passkeys";
import { useAuth } from "./hooks/auth";

export function E2eeUnlock() {
  const { unlock, isUnlocking, unlockError } = usePasskeys();
  const { signOut } = useAuth();

  return (
    <div className="flex flex-col gap-4 rounded border border-slate-200 bg-white p-6">
      <div className="text-lg font-medium">Unlock your encrypted data</div>
      <div className="text-sm text-slate-600">
        Use your passkey to unlock your encrypted data for this session.
      </div>
      <div className="flex gap-2">
        <Button onClick={unlock} disabled={isUnlocking}>
          {isUnlocking ? "Unlocking..." : "Unlock with passkey"}
        </Button>
        <Button onClick={signOut}>Sign out</Button>
      </div>
      {unlockError ? (
        <div className="text-sm text-red-600">{unlockError}</div>
      ) : null}
    </div>
  );
}
