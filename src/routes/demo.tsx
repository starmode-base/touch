import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "~/components/atoms";
import {
  createPrfPasskey,
  deriveKekWithWebAuthn,
  generateKekSalt,
  toHex,
} from "~/lib/e2ee";

export const Route = createFileRoute("/demo")({
  ssr: false,
  component: Home,
});

function Home() {
  const [prfResult, setPrfResult] = useState("");
  const [prfError, setPrfError] = useState("");
  const [createResult, setCreateResult] = useState("");
  const [createError, setCreateError] = useState("");

  return (
    <div className="grid flex-1 grid-cols-3 gap-4 p-4">
      <div className="flex flex-col gap-4 rounded bg-violet-100 p-4">
        WebAuthn PRF
        <div className="flex gap-2">
          <Button
            onClick={async () => {
              setCreateError("");
              setCreateResult("");

              try {
                const cred = await createPrfPasskey({
                  rpId: location.hostname,
                });

                console.log("cred", cred);

                setCreateResult(
                  `Created PRF passkey.\nCredential ID: ${cred.credentialId.slice(0, 32)}...\nPublic Key: ${cred.publicKey.slice(0, 32)}...\nTransports: ${cred.transports.join(", ")}\nAlgorithm: ${cred.algorithm}`,
                );
              } catch (e) {
                setCreateError((e as Error).message);
              }
            }}
          >
            Create E2EE passkey (PRF)
          </Button>
          <Button
            onClick={async () => {
              setPrfError("");
              setPrfResult("");
              try {
                const kekSalt = generateKekSalt();
                const { kek, prfOutput } = await deriveKekWithWebAuthn({
                  kekSalt,
                  origin: location.origin,
                });
                setPrfResult(
                  `KEK (32B hex): ${toHex(kek)}\nPRF (32B hex): ${toHex(prfOutput)}`,
                );
              } catch (e) {
                setPrfError((e as Error).message);
              }
            }}
          >
            Derive KEK (WebAuthn PRF)
          </Button>
        </div>
        {createResult ? (
          <pre className="whitespace-pre-wrap">{createResult}</pre>
        ) : null}
        {createError ? (
          <pre className="whitespace-pre-wrap text-red-700">{createError}</pre>
        ) : null}
        {prfResult ? (
          <pre className="whitespace-pre-wrap">{prfResult}</pre>
        ) : null}
        {prfError ? (
          <pre className="whitespace-pre-wrap text-red-700">{prfError}</pre>
        ) : null}
      </div>
    </div>
  );
}
