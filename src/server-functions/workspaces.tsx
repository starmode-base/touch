import { createServerFn } from "@tanstack/react-start";
import { db, schema } from "~/postgres/db";
import { z } from "zod";
import { desc, eq, inArray } from "drizzle-orm";
import { SecureToken } from "~/lib/secure-token";
import { ensureViewerMiddleware } from "~/middleware/auth-middleware";
import { invariant } from "@tanstack/react-router";
import { generateTxId } from "../postgres/helpers";

/**
 * Validation schema for creating a workspace
 */
export const createWorkspaceInputSchema = z.object({
  name: z.string().trim().nonempty().max(64),
});

/**
 * Create workspace
 */
export const createWorkspaceSF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .validator(z.array(createWorkspaceInputSchema))
  .handler(async ({ data, context }) => {
    // Transaction will roll back the first insert if the second insert fails
    const result = await db().transaction(async (tx) => {
      const txid = await generateTxId(tx);

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

      // Establish contact roles for the workspace
      await tx.insert(schema.contactRoles).values([
        { workspaceId, key: "inner_circle", name: "Inner circle" },
        { workspaceId, key: "peer_referral", name: "Peer referral" },
      ]);

      return { txid };
    });

    return result;
  });

/**
 * Update workspace
 */
export const updateWorkspaceSF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .validator(
    z.array(
      z.object({
        key: z.object({
          id: SecureToken,
        }),
        fields: z.object({
          name: createWorkspaceInputSchema.shape.name,
        }),
      }),
    ),
  )
  .handler(async ({ data, context }) => {
    context.ensureIsInWorkspace(data.map((item) => item.key.id));

    const result = await db().transaction(async (tx) => {
      const txid = await generateTxId(tx);

      await Promise.all(
        data.map((item) =>
          tx
            .update(schema.workspaces)
            .set(item.fields)
            .where(eq(schema.workspaces.id, item.key.id)),
        ),
      );

      return { txid };
    });

    return result;
  });

/**
 * Delete workspace
 */
export const deleteWorkspaceSF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .validator(z.array(SecureToken))
  .handler(async ({ data, context }) => {
    context.ensureIsInWorkspace(data);

    const result = await db().transaction(async (tx) => {
      const txid = await generateTxId(tx);

      await tx
        .delete(schema.workspaces)
        .where(inArray(schema.workspaces.id, data));

      return { txid };
    });

    return result;
  });

/**
 * List workspaces
 */
export const listWorkspacesSF = createServerFn({ method: "GET" })
  .middleware([ensureViewerMiddleware])
  .handler(async ({ context }) => {
    // TODO: Move to middleware
    const workspaceIds = context.viewer.workspaceMemberships.map(
      (membership) => membership.workspaceId,
    );

    const workspaces = await db()
      .select()
      .from(schema.workspaces)
      .where(inArray(schema.workspaces.id, workspaceIds))
      .orderBy(desc(schema.workspaces.createdAt), desc(schema.workspaces.id));
    return workspaces;
  });
