import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "~/components/atoms";
import { enrollPasskey, toHex } from "~/lib/e2ee";

export const Route = createFileRoute("/demo")({
  ssr: false,
  component: Home,
});

function Home() {
  const [enrollResult, setEnrollResult] = useState("");
  const [enrollError, setEnrollError] = useState("");

  return (
    <div className="grid flex-1 grid-cols-3 gap-4 p-4">
      <div className="flex flex-col gap-4 rounded bg-violet-100 p-4">
        WebAuthn PRF (Single-Prompt)
        <div className="flex gap-2">
          <Button
            onClick={async () => {
              setEnrollError("");
              setEnrollResult("");

              try {
                const result = await enrollPasskey({
                  rpId: location.hostname,
                  rpName: "Touch Demo",
                  userDisplayName: "Demo Encryption Key",
                  origin: location.origin,
                });

                console.log("enrollment result", result);

                setEnrollResult(
                  `✅ Single-prompt enrollment complete!\n\nCredential ID: ${result.credentialId.slice(0, 32)}...\nPublic Key: ${result.publicKey.slice(0, 32)}...\nTransports: ${result.transports.join(", ")}\nAlgorithm: ${result.algorithm}\n\nKEK (32B hex): ${toHex(result.kek)}\nDEK (32B hex): ${toHex(result.dek)}\nWrapped DEK: ${result.wrappedDek.slice(0, 32)}...`,
                );
              } catch (e) {
                setEnrollError((e as Error).message);
              }
            }}
          >
            Enroll E2EE Passkey (1 prompt!)
          </Button>
        </div>
        <div className="text-sm text-slate-600">
          This now uses a single WebAuthn prompt for both authentication and PRF
          evaluation, improving UX while maintaining security.
        </div>
        {enrollResult ? (
          <pre className="text-xs whitespace-pre-wrap">{enrollResult}</pre>
        ) : null}
        {enrollError ? (
          <pre className="text-xs whitespace-pre-wrap text-red-700">
            {enrollError}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
