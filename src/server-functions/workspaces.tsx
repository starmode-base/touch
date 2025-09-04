import { createServerFn } from "@tanstack/react-start";
import { db, schema } from "~/postgres/db";
import { z } from "zod";
import { desc, eq, inArray } from "drizzle-orm";
import { SecureToken } from "~/lib/secure-token";
import { ensureViewerMiddleware } from "~/middleware/auth-middleware";
import { invariant } from "@tanstack/react-router";

/**
 * Create workspace
 */
export const createWorkspaceSF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .validator(z.array(z.object({ name: z.string() })))
  .handler(async ({ data, context }) => {
    // Transaction will roll back the first insert if the second insert fails
    await db().transaction(async (tx) => {
      const workspaceId = await tx
        .insert(schema.workspaces)
        .values(data)
        .returning({ id: schema.workspaces.id })
        .then(([workspaces]) => workspaces?.id);

      invariant(workspaceId, "Unauthorized");

      // Establish workspace membership
      await tx.insert(schema.workspaceMemberships).values({
        workspaceId,
        userId: context.viewer.id,
        role: "member",
      });
    });
  });

/**
 * Update workspace
 */
export const updateWorkspaceSF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .validator(z.array(z.object({ id: SecureToken, name: z.string() })))
  .handler(async ({ data, context }) => {
    context.ensureIsInWorkspace(data.map((item) => item.id));

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
  .middleware([ensureViewerMiddleware])
  .validator(z.array(SecureToken))
  .handler(async ({ data, context }) => {
    context.ensureIsInWorkspace(data);

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
      .orderBy(desc(schema.workspaces.createdAt), desc(schema.workspaces.id));
    return workspaces;
  },
);
