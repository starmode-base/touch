/**
 * Examples
 *
 * https://github.com/electric-sql/electric/tree/main/examples/tanstack-db-web-starter
 * https://electric-sql.com/blog/2025/07/29/local-first-sync-with-tanstack-db
 * https://tanstack.com/db/latest/docs/overview#2-electricsql-sync
 * https://tanstack.com/db/latest/docs/collections/electric-collection
 * https://github.com/TanStack/db/tree/main/examples/react
 */
import { QueryClient } from "@tanstack/query-core";
import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import {
  createWorkspaceSF,
  deleteWorkspaceSF,
  listWorkspacesSF,
  updateWorkspaceSF,
} from "~/server-functions/workspaces";
import { selectWorkspaceSchema } from "~/postgres/validation";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import z from "zod";

const queryClient = new QueryClient();

export const workspacesCollectionQuery = createCollection(
  queryCollectionOptions({
    id: "workspaces",
    queryKey: ["workspaces"],
    queryFn: () => listWorkspacesSF(),
    queryClient,
    getKey: (item) => item.id,

    refetchInterval: 5000,
    schema: selectWorkspaceSchema,

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

export const workspacesCollectionElectric = createCollection(
  electricCollectionOptions({
    id: "workspaces-electric",
    schema: z.object({
      id: z.string(),
      name: z.string(),
      created_at: z.string(),
      updated_at: z.string(),
    }),
    getKey: (item) => item.id,
    shapeOptions: {
      url: "http://localhost:3012/api/workspaces",
    },
    onInsert: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => ({
        name: item.modified.name,
      }));

      const result = await createWorkspaceSF({ data });
      console.log("inserted", result);

      return { txid: result.txid };
    },

    onUpdate: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => ({
        id: item.modified.id,
        name: item.modified.name,
      }));

      const result = await updateWorkspaceSF({ data });
      console.log("updated", result);

      return { txid: result.txid };
    },

    onDelete: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => item.modified.id);

      const result = await deleteWorkspaceSF({ data });
      console.log("deleted", result);

      return { txid: result.txid };
    },
  }),
);
