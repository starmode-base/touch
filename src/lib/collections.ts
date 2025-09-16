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
import {
  createContactRoleAssignmentSF,
  // deleteContactRoleAssignmentSF,
} from "~/server-functions/contact-role-assignments";

const queryClient = new QueryClient();

/**
 * Workspaces collection (Query)
 */
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

/**
 * Workspaces collection (Electric)
 */
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
      url: new URL(`/api/workspaces`, window.location.origin).toString(),
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
        key: {
          id: item.modified.id,
        },
        fields: {
          name: item.modified.name,
        },
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
 * Contacts collection (Electric)
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
      url: new URL(`/api/contacts`, window.location.origin).toString(),
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
        data.map((item) => deleteContactSF({ data: { id: item } })),
      );

      return { txid: txid.map((item) => item.txid) };
    },
  }),
);

/**
 * Contact roles collection (Electric)
 */
export const contactRolesCollection = createCollection(
  electricCollectionOptions({
    id: "contact-roles-electric",
    schema: z.object({
      id: z.string(),
      key: z.string(),
      name: z.string(),
      workspace_id: z.string(),
    }),
    getKey: (item) => item.id,
    shapeOptions: {
      url: new URL(`/api/contact-roles`, window.location.origin).toString(),
    },
  }),
);

/**
 * Contact role assignments collection (Electric)
 */
export const contactRoleAssignmentsCollection = createCollection(
  electricCollectionOptions({
    id: "contact-role-assignments-electric",
    schema: z.object({
      workspace_id: z.string(),
      contact_id: z.string(),
      contact_role_id: z.string(),
      // created_at: z.string(),
      // updated_at: z.string(),
    }),
    getKey: (item) =>
      item.workspace_id + item.contact_id + item.contact_role_id,
    shapeOptions: {
      url: new URL(
        `/api/contact-role-assignments`,
        window.location.origin,
      ).toString(),
    },
    onInsert: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => ({
        workspaceId: item.modified.workspace_id,
        contactId: item.modified.contact_id,
        contactRoleId: item.modified.contact_role_id,
      }));

      const txid = await Promise.all(
        data.map((item) => createContactRoleAssignmentSF({ data: item })),
      );

      return { txid: txid.map((item) => item.txid) };
    },
    // onDelete: async ({ transaction }) => {
    //   const data = transaction.mutations.map((item) => ({
    //     workspaceId: item.modified.workspace_id,
    //     contactId: item.modified.contact_id,
    //     contactRoleId: item.modified.contact_role_id,
    //   }));

    //   const txid = await Promise.all(
    //     data.map((item) => deleteContactRoleAssignmentSF({ data: item })),
    //   );

    //   return { txid: txid.map((item) => item.txid) };
    // },
  }),
);
