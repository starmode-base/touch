import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { Button } from "~/components/atoms";
import { usePasskeys } from "~/components/hooks/passkeys";
import { useE2ee } from "~/components/hooks/e2ee";
import { passkeysCollection } from "~/collections/passkeys-collection";
import { getCachedCredentialId } from "~/lib/e2ee";

export const Route = createFileRoute("/profile")({
  ssr: false,
  component: ProfilePage,
});

function ProfilePage() {
  const { dek } = useE2ee();
  const {
    addPasskey,
    deletePasskey,
    unlock,
    unlockWithSpecificPasskey,
    triedAutoUnlock,
    isAdding,
    addError,
    addSuccess,
    isDeleting,
    deleteError,
    deleteSuccess,
  } = usePasskeys();

  const passkeysQuery = useLiveQuery((q) =>
    q.from({ passkey: passkeysCollection }),
  );

  const passkeys = passkeysQuery.data;

  const activeCredentialId = getCachedCredentialId();

  const handleAddPasskey = async () => {
    try {
      await addPasskey();
    } catch (e) {
      console.error("Failed to add passkey:", e);
    }
  };

  const handleDeletePasskey = (credentialId: string) => {
    if (passkeys.length <= 1) {
      alert("Cannot delete the last passkey");
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to delete this passkey? You won't be able to decrypt your data on this device anymore.",
      )
    ) {
      return;
    }

    try {
      deletePasskey(credentialId);
    } catch (e) {
      console.error("Failed to delete passkey:", e);
    }
  };

  const handleUnlock = async () => {
    try {
      await unlock(passkeys);
    } catch (e) {
      console.error("Failed to unlock:", e);
    }
  };

  const handleUnlockWithPasskey = async (passkey: (typeof passkeys)[0]) => {
    try {
      await unlockWithSpecificPasskey(passkey);
    } catch (e) {
      console.error("Failed to unlock with passkey:", e);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Passkey management</h1>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your passkeys</h2>
          <Button
            onClick={handleAddPasskey}
            disabled={(!dek && triedAutoUnlock) || isAdding}
          >
            {isAdding ? "Adding..." : "Add passkey"}
          </Button>
        </div>

        {!dek && triedAutoUnlock ? (
          <div className="rounded bg-blue-100 p-4 text-sm">
            <p>
              E2EE is locked. You can view and delete passkeys, but you need to{" "}
              <button
                onClick={handleUnlock}
                className="font-semibold underline"
              >
                unlock
              </button>{" "}
              to add new passkeys.
            </p>
          </div>
        ) : null}

        {addSuccess ? (
          <div className="rounded bg-green-100 p-2 text-sm text-green-800">
            {addSuccess}
          </div>
        ) : null}

        {addError ? (
          <div className="rounded bg-red-100 p-2 text-sm text-red-800">
            {addError}
          </div>
        ) : null}

        {deleteSuccess ? (
          <div className="rounded bg-green-100 p-2 text-sm text-green-800">
            {deleteSuccess}
          </div>
        ) : null}

        {deleteError ? (
          <div className="rounded bg-red-100 p-2 text-sm text-red-800">
            {deleteError}
          </div>
        ) : null}

        {passkeys.length === 0 ? (
          <div className="rounded bg-gray-100 p-4">No passkeys found</div>
        ) : (
          <div className="flex flex-col gap-2">
            {passkeys.map((passkey) => {
              const isActive = passkey.credential_id === activeCredentialId;
              return (
                <div
                  key={passkey.credential_id}
                  className={`flex items-center justify-between rounded border p-4 ${
                    isActive
                      ? "border-green-500 bg-green-50"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="text-sm">
                      <strong>Credential ID:</strong>{" "}
                      {passkey.credential_id.slice(0, 16)}...
                      {isActive ? (
                        <span className="ml-2 text-green-700">(active)</span>
                      ) : null}
                    </div>
                    <div className="text-sm">
                      <strong>Algorithm:</strong> {passkey.algorithm}
                    </div>
                    <div className="text-sm">
                      <strong>Created:</strong> {passkey.created_at}
                    </div>
                    <div className="text-sm">
                      <strong>Transports:</strong>{" "}
                      {passkey.transports.join(", ")}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        void handleUnlockWithPasskey(passkey);
                      }}
                      disabled={!!dek || isDeleting || !triedAutoUnlock}
                    >
                      Unlock
                    </Button>
                    <Button
                      onClick={() => {
                        handleDeletePasskey(passkey.credential_id);
                      }}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
