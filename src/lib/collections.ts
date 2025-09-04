import { QueryClient } from "@tanstack/query-core";
import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import {
  createWorkspaceSF,
  deleteWorkspaceSF,
  listWorkspacesSF,
  updateWorkspaceSF,
} from "~/server-functions/workspaces";
// import { selectWorkspaceSchema } from "~/postgres/validation";

const queryClient = new QueryClient();

export const workspacesCollection = createCollection(
  queryCollectionOptions({
    id: "workspaces",
    queryKey: ["workspaces"],
    queryFn: () => listWorkspacesSF(),
    queryClient,
    getKey: (item) => item.id,

    refetchInterval: 5000,
    // schema: selectWorkspaceSchema,

    onInsert: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => ({
        name: item.modified.name,
      }));

      await createWorkspaceSF({ data });
    },

    onUpdate: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => ({
        id: item.modified.id,
        name: item.modified.name,
      }));

      await updateWorkspaceSF({ data });
    },

    onDelete: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => item.modified.id);

      await deleteWorkspaceSF({ data });
    },
  }),
);
