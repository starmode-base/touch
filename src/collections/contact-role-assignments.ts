import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import z from "zod";
import { queryClient } from "~/lib/query-client";
import {
  createContactRoleAssignmentSF,
  deleteContactRoleAssignmentSF,
  listContactRoleAssignmentsSF,
} from "~/server-functions/contact-role-assignments";

/**
 * Contact role assignments collection
 */
export const contactRoleAssignmentsCollection = createCollection(
  queryCollectionOptions({
    id: "contact-role-assignments",
    queryKey: ["contact-role-assignments"],
    queryFn: () => listContactRoleAssignmentsSF(),
    queryClient,
    // Only sync in the browser: during SSR there is no Start context for
    // server-function RPC calls
    enabled: typeof window !== "undefined",
    schema: z.object({
      contact_id: z.string(),
      contact_role_id: z.string(),
      user_id: z.string(),
    }),
    getKey: (item) => {
      return item.contact_id + "|" + item.contact_role_id;
    },
    onInsert: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => ({
        contactId: item.modified.contact_id,
        contactRoleId: item.modified.contact_role_id,
      }));

      await Promise.all(
        data.map((item) => createContactRoleAssignmentSF({ data: item })),
      );
    },
    onDelete: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => ({
        contactId: item.modified.contact_id,
        contactRoleId: item.modified.contact_role_id,
      }));

      await Promise.all(
        data.map((item) => deleteContactRoleAssignmentSF({ data: item })),
      );
    },
  }),
);
