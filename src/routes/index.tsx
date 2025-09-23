import { SignOutButton, UserButton } from "@clerk/tanstack-react-start";
import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button, LinkButton } from "~/components/atoms";
import { workspacesCollectionQuery } from "~/lib/collections";
import { genSecureToken } from "~/lib/secure-token";
import {
  createWorkspaceInputSchema,
  listWorkspacesSF,
} from "~/server-functions/workspaces";

export const Route = createFileRoute("/")({
  ssr: false,
  loader: () => listWorkspacesSF(),
  component: Home,
});

function Home() {
  const [isValid, setIsValid] = useState(false);

  const workspacesQuery = useLiveQuery((q) => {
    return q
      .from({ workspace: workspacesCollectionQuery })
      .orderBy(({ workspace }) => workspace.createdAt, "desc")
      .orderBy(({ workspace }) => workspace.id, "desc");
  });

  return (
    <>
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <LinkButton to="/">Home</LinkButton>
          <LinkButton to="/demo">Demo</LinkButton>
        </div>
        <div className="flex items-center gap-2">
          <UserButton />
          <SignOutButton>
            <Button>Sign out</Button>
          </SignOutButton>
        </div>
      </div>
      <div className="grid flex-1 gap-4 p-4">
        <div className="flex flex-col gap-4 rounded border border-slate-200 bg-white p-4">
          <div className="text-lg font-medium">Workspaces</div>
          <form
            className="flex max-w-xl gap-2"
            onInput={(e) => {
              const fd = new FormData(e.currentTarget);

              const ok = createWorkspaceInputSchema.safeParse({
                name: fd.get("name"),
              }).success;

              setIsValid(e.currentTarget.checkValidity() && ok);
            }}
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);

              const values = createWorkspaceInputSchema.parse({
                name: fd.get("name"),
              });

              workspacesCollectionQuery.insert({
                id: genSecureToken(),
                name: values.name,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });

              e.currentTarget.reset();
              setIsValid(false);
            }}
          >
            <input
              type="text"
              name="name"
              placeholder="Workspace name"
              required
              autoFocus
              data-1p-ignore // 1password ignore
              className="flex-1 rounded border border-slate-200 px-2"
            />
            <Button type="submit" disabled={!isValid} role="button">
              Create Workspace
            </Button>
          </form>
          <div className="flex flex-col gap-1">
            {workspacesQuery.data.map((workspace) => (
              <div key={workspace.id} className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    const ok = confirm(
                      `Are you sure you want to delete this workspace?`,
                    );
                    if (!ok) return;
                    workspacesCollectionQuery.delete(workspace.id);
                  }}
                >
                  Delete
                </Button>
                <Link
                  to="/$workspace/contacts"
                  params={{ workspace: workspace.id }}
                >
                  {workspace.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
