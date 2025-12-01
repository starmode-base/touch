import { createFileRoute } from "@tanstack/react-router";
import { Button } from "~/components/atoms";
import { useE2ee } from "~/components/hooks/e2ee";
import { cryptoSession } from "~/lib/e2ee-session";

export const Route = createFileRoute("/_auth/settings/")({
  component: ProfilePage,
});

function ProfilePage() {
  const {
    passkeys,
    createPasskey,
    canCreatePasskey,
    isCreatingPasskey,
    addPasskey,
    canAddPasskey,
    isAddingPasskey,
    deletePasskey,
    unlock,
    canUnlock,
  } = useE2ee();

  const activeCredentialId = cryptoSession.get()?.credentialId;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Passkey management</h1>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your passkeys</h2>
          <div className="flex gap-2">
            <Button onClick={createPasskey} disabled={!canCreatePasskey}>
              {/* {isCreatingPasskey ? "Creating..." : "Create passkey"} */}
              {isCreatingPasskey ? "Setting up..." : "Enable encryption"}
            </Button>
            <Button onClick={addPasskey} disabled={!canAddPasskey}>
              {isAddingPasskey ? "Adding..." : "Add passkey"}
            </Button>
          </div>
        </div>

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
                      <strong>WebAuthn user display name:</strong>{" "}
                      {passkey.webauthn_user_display_name}
                      {isActive ? (
                        <span className="ml-2 text-green-700">(active)</span>
                      ) : null}
                    </div>
                    <div className="text-sm">
                      <strong>WebAuthn user name:</strong>{" "}
                      {passkey.webauthn_user_name}
                    </div>
                    <div className="text-sm">
                      <strong>WebAuthn user ID:</strong>{" "}
                      {passkey.webauthn_user_id}
                    </div>
                    <div className="text-sm">
                      <strong>Relying party ID:</strong> {passkey.rp_id}
                    </div>
                    <div className="text-sm">
                      <strong>Relying party name:</strong> {passkey.rp_name}
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
                        void unlock([passkey]);
                      }}
                      disabled={!canUnlock}
                    >
                      Unlock
                    </Button>
                    <Button
                      onClick={() => {
                        if (passkeys.length <= 1) {
                          alert("Cannot delete the last passkey");
                          return;
                        }

                        if (!window.confirm("Delete this passkey?")) {
                          return;
                        }

                        deletePasskey(passkey.id);
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
