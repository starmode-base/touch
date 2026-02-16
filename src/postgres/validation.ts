/**
 * https://orm.drizzle.team/docs/zod
 */
import {
  createSelectSchema,
  createInsertSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { schema } from "./db";
import type { z } from "zod";

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
