import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "~/components/atoms";
import { workspacesCollectionQuery } from "~/lib/collections";
import { genSecureToken } from "~/lib/secure-token";
import { listWorkspacesSF } from "~/server-functions/workspaces";

export const Route = createFileRoute("/")({
  ssr: false,
  loader: () => listWorkspacesSF(),
  component: Home,
});

function Home() {
  const workspacesQuery = useLiveQuery((q) => {
    return q
      .from({ workspace: workspacesCollectionQuery })
      .orderBy(({ workspace }) => workspace.createdAt, "desc")
      .orderBy(({ workspace }) => workspace.id, "desc");
  });

  return (
    <div className="grid flex-1 gap-4 p-4">
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
        <div className="flex flex-col gap-1">
          {workspacesQuery.data.map((workspace) => (
            <div key={workspace.id} className="flex gap-2">
              <Button
                onClick={() => {
                  workspacesCollectionQuery.delete(workspace.id);
                }}
              >
                Delete
              </Button>
              <Button
                onClick={() => {
                  workspacesCollectionQuery.update(workspace.id, (draft) => {
                    draft.name = "Workspace 2 " + genSecureToken(3);
                  });
                }}
              >
                Update
              </Button>
              <Link to="/$workspace" params={{ workspace: workspace.id }}>
                {workspace.name} - {workspace.id.slice(0, 8)}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
