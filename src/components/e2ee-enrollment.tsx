import { Button } from "./atoms";
import { useE2ee } from "./hooks/e2ee";

/**
 * E2eeEnrollment component that allows the user to enroll in E2EE
 */
export function E2eeEnrollment() {
  const { createPasskey, canCreatePasskey, isCreatingPasskey } = useE2ee();

  return (
    <div className="flex flex-col gap-4 rounded border border-slate-200 bg-white p-6">
      <div className="text-lg font-medium">Enable encryption</div>
      <div className="text-sm text-slate-600">
        Protect your data with end-to-end encryption using a passkey. Your data
        will be encrypted on your device before being sent to the server.
      </div>
      <Button onClick={createPasskey} disabled={!canCreatePasskey}>
        {isCreatingPasskey ? "Setting up..." : "Enable encryption"}
      </Button>
    </div>
  );
}
