import { Button } from "./atoms";
import { usePasskeys } from "./hooks/passkeys";

export function E2EEEnrollment() {
  const { enroll, isEnrolling, enrollError, enrollSuccess } = usePasskeys();

  return (
    <div className="flex flex-col gap-4 rounded border border-slate-200 bg-white p-6">
      <div className="text-lg font-medium">Enable encryption</div>
      <div className="text-sm text-slate-600">
        Protect your data with end-to-end encryption using a passkey. Your data
        will be encrypted on your device before being sent to the server.
      </div>
      <Button onClick={enroll} disabled={isEnrolling}>
        {isEnrolling ? "Setting up..." : "Enable encryption"}
      </Button>
      {enrollError ? (
        <div className="text-sm text-red-600">{enrollError}</div>
      ) : null}
      {enrollSuccess ? (
        <div className="text-sm text-green-600">{enrollSuccess}</div>
      ) : null}
    </div>
  );
}

export function E2EEAddPasskey() {
  const { addPasskey, isAdding, addError, addSuccess } = usePasskeys();

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm text-slate-600">
        Add another passkey to access your encrypted data from multiple devices.
      </div>
      <Button onClick={addPasskey} disabled={isAdding}>
        {isAdding ? "Adding..." : "Add another passkey"}
      </Button>
      {addError ? <div className="text-sm text-red-600">{addError}</div> : null}
      {addSuccess ? (
        <div className="text-sm text-green-600">{addSuccess}</div>
      ) : null}
    </div>
  );
}
