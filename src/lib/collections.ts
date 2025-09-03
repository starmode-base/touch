import { QueryClient } from "@tanstack/query-core";
import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import {
  createWorkspaceSF,
  getWorkspacesSF,
  updateWorkspaceSF,
} from "~/routes";

const queryClient = new QueryClient();

export const workspacesCollection = createCollection(
  queryCollectionOptions({
    queryClient,
    queryKey: ["workspaces"],
    refetchInterval: 5000,
    getKey: (item) => item.id,

    queryFn: async () => {
      return getWorkspacesSF();
    },

    onInsert: async ({ transaction }) => {
      const { modified } = transaction.mutations[0];
      console.log("Inserting:", modified);

      await createWorkspaceSF({
        data: {
          name: modified.name,
        },
      });
    },

    onUpdate: async ({ transaction }) => {
      const { original, modified } = transaction.mutations[0];
      console.log("Updating from", original, "to", modified);

      await updateWorkspaceSF({
        data: {
          id: original.id,
          name: modified.name,
        },
      });
    },
  }),
);
