import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import z from "zod";
import { queryClient } from "#lib/query-client";
import {
  createContactRoleAssignmentSF,
  deleteContactRoleAssignmentSF,
  listContactRoleAssignmentsSF,
} from "#server-functions/contact-role-assignments";
import { selectContactRoleAssignmentSchema } from "#postgres/validation";

/**
 * Collection schema
 *
 * Timestamps default client-side so inserts don't have to provide them; the
 * server rows written back after persistence carry the authoritative values.
 */
const ContactRoleAssignment = selectContactRoleAssignmentSchema.extend({
  created_at: z.string().default(() => new Date().toISOString()),
  updated_at: z.string().default(() => new Date().toISOString()),
});

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
    schema: ContactRoleAssignment,
    getKey: (item) => {
      return item.contact_id + "|" + item.contact_role_id;
    },
    onInsert: async ({ transaction }) => {
      const assignments = await Promise.all(
        transaction.mutations.map((item) =>
          createContactRoleAssignmentSF({
            data: {
              contactId: item.modified.contact_id,
              contactRoleId: item.modified.contact_role_id,
            },
          }),
        ),
      );

      // Write the authoritative rows back instead of refetching
      await contactRoleAssignmentsCollection.utils.writeUpsert(assignments);
    },
    onDelete: async ({ transaction }) => {
      await Promise.all(
        transaction.mutations.map((item) =>
          deleteContactRoleAssignmentSF({
            data: {
              contactId: item.original.contact_id,
              contactRoleId: item.original.contact_role_id,
            },
          }),
        ),
      );

      // Remove the rows locally instead of refetching
      await contactRoleAssignmentsCollection.utils.writeDelete(
        transaction.mutations.map((item) => item.key),
      );
    },
  }),
);
