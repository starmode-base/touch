import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import z from "zod";
import {
  createContactRoleAssignmentSF,
  deleteContactRoleAssignmentSF,
} from "~/server-functions/contact-role-assignments";

/**
 * Contact role assignments collection (Electric)
 */

export const contactRoleAssignmentsCollection = createCollection(
  electricCollectionOptions({
    id: "contact-role-assignments-electric",
    schema: z.object({
      contact_id: z.string(),
      contact_role_id: z.string(),
      user_id: z.string(),
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
