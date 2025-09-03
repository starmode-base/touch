import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { workspacesCollection } from "~/lib/collections";
import { genSecureToken } from "~/lib/secure-token";
import { db, schema } from "~/postgres/db";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";

export const createWorkspaceSF = createServerFn({ method: "POST" })
  .validator(z.object({ name: z.string() }))
  .handler(async ({ data }) => {
    const workspace = await db()
      .insert(schema.workspaces)
      .values({ name: data.name })
      .returning();

    return workspace;
  });

export const updateWorkspaceSF = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), name: z.string() }))
  .handler(async ({ data }) => {
    const workspace = await db()
      .update(schema.workspaces)
      .set({ name: data.name })
      .where(eq(schema.workspaces.id, data.id))
      .returning();

    return workspace;
  });

export const getWorkspacesSF = createServerFn({ method: "GET" }).handler(
  async () => {
    const workspaces = await db()
      .select()
      .from(schema.workspaces)
      .orderBy(asc(schema.workspaces.createdAt));
    return workspaces;
  },
);

export const Route = createFileRoute("/")({
  ssr: false,
  loader: () => getWorkspacesSF(),
  component: Home,
});

function Home() {
  const data = Route.useLoaderData();
  const createWorkspace = useServerFn(createWorkspaceSF);
  const router = useRouter();

  const workspaces = useLiveQuery((q) => {
    return q.from({ workspace: workspacesCollection });
  });

  return (
    <div className="grid flex-1 grid-cols-2 gap-4 p-4">
      <div className="flex flex-col gap-4 rounded bg-sky-100 p-4">
        RPC
        <button
          onClick={async () => {
            await createWorkspace({
              data: { name: "Workspace " + genSecureToken(3) },
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
        Live Query
        <button
          onClick={() => {
            workspacesCollection.insert({
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
          {workspaces.data.map((workspace) => (
            <div
              key={workspace.id}
              role="button"
              className="select-none"
              onClick={() => {
                workspacesCollection.update(workspace.id, (draft) => {
                  draft.name = "Workspace 2 " + genSecureToken(3);
                });
              }}
            >
              {workspace.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
