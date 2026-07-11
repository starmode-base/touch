/**
 * Drizzle-derived zod schemas
 *
 * https://orm.drizzle.team/docs/zod
 *
 * Imports the table definitions directly (not via ./db, which pulls in the
 * pg driver and cloudflare:workers) so these schemas are safe to use in
 * client code, e.g. as TanStack DB collection schemas.
 *
 * Columns typed with `.$type<...>()` (jsonb, text unions) are overridden
 * explicitly because drizzle-zod cannot derive zod schemas from them.
 */
import {
  createSelectSchema,
  createInsertSchema,
  createUpdateSchema,
} from "drizzle-zod";
import * as schema from "./schema";
import { z } from "zod";

/**
 * Contacts
 */
export const selectContactSchema = createSelectSchema(schema.contacts);
export const insertContactSchema = createInsertSchema(schema.contacts);
export const updateContactSchema = createUpdateSchema(schema.contacts);

export type SelectContact = z.infer<typeof selectContactSchema>;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type UpdateContact = z.infer<typeof updateContactSchema>;

export type ContactSelect = typeof schema.contacts.$inferSelect;
export type ContactInsert = typeof schema.contacts.$inferInsert;

/**
 * Contact roles
 */
export const selectContactRoleSchema = createSelectSchema(schema.contactRoles);

export type SelectContactRole = z.infer<typeof selectContactRoleSchema>;

/**
 * Contact role assignments
 */
export const selectContactRoleAssignmentSchema = createSelectSchema(
  schema.contactRoleAssignments,
);

export type SelectContactRoleAssignment = z.infer<
  typeof selectContactRoleAssignmentSchema
>;

/**
 * Contact activities
 */
export const selectContactActivitySchema = createSelectSchema(
  schema.contactActivities,
  {
    kind: z.enum([
      "user:touch",
      "user:note",
      "system:created",
      "system:updated",
    ]),
    details: z
      .object({ name: z.string(), linkedin: z.string().nullable() })
      .nullable(),
  },
);

export type SelectContactActivity = z.infer<typeof selectContactActivitySchema>;

/**
 * Passkeys
 */
export const selectPasskeySchema = createSelectSchema(schema.passkeys, {
  transports: z.array(z.string()),
});

export type SelectPasskey = z.infer<typeof selectPasskeySchema>;
