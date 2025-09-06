import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  workspacesCollectionElectric,
  workspacesCollectionQuery,
} from "~/lib/collections";
import { genSecureToken } from "~/lib/secure-token";
import {
  createWorkspaceSF,
  listWorkspacesSF,
} from "~/server-functions/workspaces";

export const Route = createFileRoute("/")({
  ssr: false,
  loader: () => listWorkspacesSF(),
  component: Home,
});

function Home() {
  const data = Route.useLoaderData();
  const createWorkspace = useServerFn(createWorkspaceSF);
  const router = useRouter();

  const workspacesQuery = useLiveQuery((q) => {
    return q
      .from({ workspace: workspacesCollectionQuery })
      .orderBy(({ workspace }) => workspace.createdAt, "desc")
      .orderBy(({ workspace }) => workspace.id, "desc");
  });

  const workspacesElectric = useLiveQuery((q) => {
    return q
      .from({ workspace: workspacesCollectionElectric })
      .orderBy(({ workspace }) => workspace.createdAt, "desc")
      .orderBy(({ workspace }) => workspace.id, "desc");
  });

  return (
    <div className="grid flex-1 grid-cols-3 gap-4 p-4">
      <div className="flex flex-col gap-4 rounded bg-sky-100 p-4">
        RPC
        <button
          onClick={async () => {
            await createWorkspace({
              data: [{ name: "Workspace " + genSecureToken(3) }],
            });
            await router.invalidate();
          }}
          className="h-fit w-fit rounded bg-sky-500 px-4 py-1 text-white"
        >
          Create Workspace
        </button>
        <div>
          {data.map((workspace) => (
            <div key={workspace.id}>{workspace.name}</div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded bg-emerald-100 p-4">
        Tanstack DB Query
        <button
          onClick={() => {
            workspacesCollectionQuery.insert({
              id: genSecureToken(),
              name: "Workspace " + genSecureToken(3),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }}
          className="h-fit w-fit rounded bg-sky-500 px-4 py-1 text-white"
        >
          Create Workspace
        </button>
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
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded bg-amber-100 p-4">
        Tanstack DB Electric
        <button
          onClick={() => {
            workspacesCollectionElectric.insert({
              id: genSecureToken(),
              name: "Workspace " + genSecureToken(3),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }}
          className="h-fit w-fit rounded bg-sky-500 px-4 py-1 text-white"
        >
          Create Workspace
        </button>
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
    </div>
  );
}
