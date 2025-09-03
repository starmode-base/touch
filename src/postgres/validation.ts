/**
 * https://orm.drizzle.team/docs/zod
 */
import {
  createSelectSchema,
  createInsertSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { schema } from "./db";
import type { z } from "node_modules/zod/v4/classic/index.cjs";

export const selectWorkspaceSchema = createSelectSchema(schema.workspaces);
export const insertWorkspaceSchema = createInsertSchema(schema.workspaces);
export const updateWorkspaceSchema = createUpdateSchema(schema.workspaces);

export type SelectWorkspace = z.infer<typeof selectWorkspaceSchema>;
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type UpdateWorkspace = z.infer<typeof updateWorkspaceSchema>;

export type WorkspaceSelect = typeof schema.workspaces.$inferSelect;
export type WorkspaceInsert = typeof schema.workspaces.$inferInsert;
