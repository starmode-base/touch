import { createServerFn } from "@tanstack/react-start";
import { db, schema } from "~/postgres/db";
import { z } from "zod";
import { asc, eq, inArray } from "drizzle-orm";
import { SecureToken } from "~/lib/secure-token";

/**
 * Create workspace
 */
export const createWorkspaceSF = createServerFn({ method: "POST" })
  .validator(z.array(z.object({ name: z.string() })))
  .handler(async ({ data }) => {
    await db().insert(schema.workspaces).values(data);
  });

/**
 * Update workspace
 */
export const updateWorkspaceSF = createServerFn({ method: "POST" })
  .validator(z.array(z.object({ id: SecureToken, name: z.string() })))
  .handler(async ({ data }) => {
    await db().transaction(async (tx) => {
      await Promise.all(
        data.map((item) =>
          tx
            .update(schema.workspaces)
            .set({ name: item.name })
            .where(eq(schema.workspaces.id, item.id)),
        ),
      );
    });
  });

/**
 * Delete workspace
 */
export const deleteWorkspaceSF = createServerFn({ method: "POST" })
  .validator(z.array(SecureToken))
  .handler(async ({ data }) => {
    await db()
      .delete(schema.workspaces)
      .where(inArray(schema.workspaces.id, data));
  });

/**
 * List workspaces
 */
export const listWorkspacesSF = createServerFn({ method: "GET" }).handler(
  async () => {
    const workspaces = await db()
      .select()
      .from(schema.workspaces)
      .orderBy(asc(schema.workspaces.createdAt));
    return workspaces;
  },
);
