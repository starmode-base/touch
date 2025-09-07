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
import { selectWorkspaceSchema } from "~/postgres/validation";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import z from "zod";
import {
  createWorkspaceSF,
  deleteWorkspaceSF,
  listWorkspacesSF,
  updateWorkspaceSF,
} from "~/server-functions/workspaces";
import {
  createContactSF,
  deleteContactSF,
  updateContactSF,
} from "~/server-functions/contacts";

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
        key: { id: item.modified.id },
        fields: { name: item.modified.name },
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

      return { txid: result.txid };
    },

    onUpdate: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => ({
        key: { id: item.modified.id },
        fields: { name: item.modified.name },
      }));

      const result = await updateWorkspaceSF({ data });

      return { txid: result.txid };
    },

    onDelete: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => item.modified.id);

      const result = await deleteWorkspaceSF({ data });

      return { txid: result.txid };
    },
  }),
);

/**
 * Contacts collection
 */
export const contactsCollection = createCollection(
  electricCollectionOptions({
    id: "contacts-electric",
    schema: z.object({
      id: z.string(),
      name: z.string(),
      linkedin: z.string().nullable(),
      created_at: z.string(),
      updated_at: z.string(),
      workspace_id: z.string(),
    }),
    getKey: (item) => item.id,
    shapeOptions: {
      url: "http://localhost:3012/api/contacts",
    },
    onInsert: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => {
        return {
          workspaceId: item.modified.workspace_id,
          name: item.modified.name,
          linkedin: item.modified.linkedin,
        };
      });

      const txid = await Promise.all(
        data.map((item) => createContactSF({ data: item })),
      );

      return { txid: txid.map((item) => item.txid) };
    },

    onUpdate: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => ({
        key: {
          id: item.modified.id,
        },
        fields: {
          name: item.modified.name,
          linkedin: item.modified.linkedin,
        },
      }));

      const txid = await Promise.all(
        data.map((item) => updateContactSF({ data: item })),
      );

      return { txid: txid.map((item) => item.txid) };
    },

    onDelete: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => item.modified.id);

      const txid = await Promise.all(
        data.map((item) => deleteContactSF({ data: { contactId: item } })),
      );

      return { txid: txid.map((item) => item.txid) };
    },
  }),
);
