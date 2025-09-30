import { useLiveQuery } from "@tanstack/react-db";
import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "~/components/atoms";
import {
  workspacesCollectionElectric,
  workspacesCollectionQuery,
} from "~/lib/collections";
import {
  createPrfPasskey,
  deriveKekWithWebAuthn,
  generateKekSalt,
  toHex,
} from "~/lib/e2ee";
import { genSecureToken } from "~/lib/secure-token";
import {
  createWorkspaceSF,
  listWorkspacesSF,
} from "~/server-functions/workspaces";

export const Route = createFileRoute("/demo")({
  ssr: false,
  loader: () => listWorkspacesSF(),
  component: Home,
});

function Home() {
  const data = Route.useLoaderData();
  const createWorkspace = useServerFn(createWorkspaceSF);
  const router = useRouter();

  const [prfResult, setPrfResult] = useState("");
  const [prfError, setPrfError] = useState("");
  const [createResult, setCreateResult] = useState("");
  const [createError, setCreateError] = useState("");

  const workspacesQuery = useLiveQuery((q) => {
    return q
      .from({ workspace: workspacesCollectionQuery })
      .orderBy(({ workspace }) => workspace.createdAt, "desc")
      .orderBy(({ workspace }) => workspace.id, "desc");
  });

  const workspacesElectric = useLiveQuery((q) => {
    return q
      .from({ workspace: workspacesCollectionElectric })
      .orderBy(({ workspace }) => workspace.created_at, "desc")
      .orderBy(({ workspace }) => workspace.id, "desc");
  });

  return (
    <div className="grid flex-1 grid-cols-3 gap-4 p-4">
      <div className="flex flex-col gap-4 rounded bg-sky-100 p-4">
        RPC
        <Button
          onClick={async () => {
            await createWorkspace({
              data: [{ name: "Workspace " + genSecureToken(3) }],
            });
            await router.invalidate();
          }}
        >
          Create Workspace
        </Button>
        <div>
          {data.map((workspace) => (
            <div key={workspace.id}>{workspace.name}</div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded bg-emerald-100 p-4">
        Tanstack DB Query
        <Button
          onClick={() => {
            workspacesCollectionQuery.insert({
              id: genSecureToken(),
              name: "Workspace " + genSecureToken(3),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }}
        >
          Create Workspace
        </Button>
        <div>
          {workspacesQuery.data.map((workspace) => (
            <div key={workspace.id} className="flex gap-2">
              <div
                role="button"
                className="select-none"
                onClick={() => {
                  workspacesCollectionQuery.delete(workspace.id);
                }}
              >
                Delete
              </div>
              <div
                role="button"
                className="select-none"
                onClick={() => {
                  workspacesCollectionQuery.update(workspace.id, (draft) => {
                    draft.name = "Workspace 2 " + genSecureToken(3);
                  });
                }}
              >
                {workspace.name} - {workspace.id.slice(0, 8)}
              </div>
              <Link
                to="/$workspace/contacts"
                params={{ workspace: workspace.id }}
              >
                Go
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded bg-amber-100 p-4">
        Tanstack DB Electric
        <Button
          onClick={() => {
            workspacesCollectionElectric.insert({
              id: genSecureToken(),
              name: "Workspace " + genSecureToken(3),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }}
        >
          Create Workspace
        </Button>
        <div>
          {workspacesElectric.data.map((workspace) => (
            <div key={workspace.id} className="flex gap-2">
              <div
                role="button"
                className="select-none"
                onClick={() => {
                  workspacesCollectionElectric.delete(workspace.id);
                }}
              >
                Delete
              </div>
              <div
                role="button"
                className="select-none"
                onClick={() => {
                  workspacesCollectionElectric.update(workspace.id, (draft) => {
                    draft.name = "Workspace 2 " + genSecureToken(3);
                  });
                }}
              >
                {workspace.name} - {workspace.id.slice(0, 8)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded bg-violet-100 p-4">
        WebAuthn PRF
        <div className="flex gap-2">
          <Button
            onClick={async () => {
              setCreateError("");
              setCreateResult("");
              try {
                const cred = await createPrfPasskey();
                setCreateResult(
                  `Created PRF passkey. PRF enabled: ${cred.prfEnabled ? "true" : "false"}. rawId: ${toHex(cred.rawId).slice(0, 32)}…`,
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
