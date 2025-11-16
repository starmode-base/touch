import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { Button } from "~/components/atoms";
import { usePasskeys } from "~/components/hooks/passkeys";
import { useE2ee } from "~/components/hooks/e2ee";
import { passkeysCollection } from "~/collections/passkeys";
import { getCachedCredentialId } from "~/lib/e2ee";
import { UserButton } from "@clerk/tanstack-react-start";

export const Route = createFileRoute("/_auth/settings/")({
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
  } = usePasskeys();

  const passkeysQuery = useLiveQuery((q) =>
    q.from({ passkey: passkeysCollection }),
  );

  const passkeys = passkeysQuery.data;

  const activeCredentialId = getCachedCredentialId();

  const handleAddPasskey = async () => {
    await addPasskey();
  };

  const handleDeletePasskey = (id: string) => {
    if (passkeys.length <= 1) {
      alert("Cannot delete the last passkey");
      return;
    }

    if (!window.confirm("Delete this passkey?")) {
      return;
    }

    deletePasskey(id);
  };

  const handleUnlock = async () => {
    await unlock(passkeys);
  };

  const handleUnlockWithPasskey = async (passkey: (typeof passkeys)[0]) => {
    await unlockWithSpecificPasskey(passkey);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Passkey management</h1>
        <UserButton
          appearance={{
            elements: {
              userButtonPopoverActionButton__signOut: { display: "none" },
            },
          }}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your passkeys</h2>
          <Button onClick={handleAddPasskey} disabled={!dek || isAdding}>
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
                      <strong>User display name:</strong>{" "}
                      {passkey.webauthn_user_display_name}
                      {isActive ? (
                        <span className="ml-2 text-green-700">(active)</span>
                      ) : null}
                    </div>
                    <div className="text-sm">
                      <strong>User name:</strong> {passkey.webauthn_user_name}
                    </div>
                    <div className="text-sm">
                      <strong>User ID:</strong> {passkey.webauthn_user_id}
                    </div>
                    <div className="text-sm">
                      <strong>Environment:</strong> {passkey.rp_id}
                    </div>
                    <div className="text-sm">
                      <strong>Relying party:</strong> {passkey.rp_name}
                    </div>
                    <div className="text-sm">
                      <strong>Credential ID:</strong> {passkey.credential_id}
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
                    >
                      Unlock
                    </Button>
                    <Button
                      onClick={() => {
                        handleDeletePasskey(passkey.id);
                      }}
                    >
                      Delete
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
