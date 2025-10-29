/**
 * Examples
 *
 * https://github.com/electric-sql/electric/tree/main/examples/tanstack-db-web-starter
 * https://electric-sql.com/blog/2025/07/29/local-first-sync-with-tanstack-db
 * https://tanstack.com/db/latest/docs/overview#2-electricsql-sync
 * https://tanstack.com/db/latest/docs/collections/electric-collection
 * https://github.com/TanStack/db/tree/main/examples/react
 */
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import z from "zod";
import {
  createContactRoleAssignmentSF,
  deleteContactRoleAssignmentSF,
} from "~/server-functions/contact-role-assignments";

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
      userId: z.string(),
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
      contact_id: z.string(),
      contact_role_id: z.string(),
      userId: z.string(),
    }),
    getKey: (item) => {
      return item.contact_id + "|" + item.contact_role_id;
    },
    shapeOptions: {
      url: new URL(
        `/api/contact-role-assignments`,
        window.location.origin,
      ).toString(),
    },
    onInsert: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => ({
        contactId: item.modified.contact_id,
        contactRoleId: item.modified.contact_role_id,
      }));

      const txid = await Promise.all(
        data.map((item) => createContactRoleAssignmentSF({ data: item })),
      );

      return { txid: txid.map((item) => item.txid) };
    },
    onDelete: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => ({
        contactId: item.modified.contact_id,
        contactRoleId: item.modified.contact_role_id,
      }));

      const txid = await Promise.all(
        data.map((item) => deleteContactRoleAssignmentSF({ data: item })),
      );

      return { txid: txid.map((item) => item.txid) };
    },
  }),
);

/**
 * Contact activities collection (Electric)
 */
export const contactActivitiesCollection = createCollection(
  electricCollectionOptions({
    id: "contact-activities-electric",
    schema: z.object({
      id: z.string(),
      created_at: z.string(),
      updated_at: z.string(),
      userId: z.string(),
      contact_id: z.string(),
      happened_at: z.string(),
      kind: z.string(),
      body: z.string(),
      details: z.object({
        name: z.string(),
        linkedin: z.string().nullable(),
      }),
    }),
    getKey: (item) => item.id,
    shapeOptions: {
      url: new URL(
        `/api/contact-activities`,
        window.location.origin,
      ).toString(),
    },
  }),
);
