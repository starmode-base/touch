import { createServerFn } from "@tanstack/react-start";
import { db, schema, type PgTx } from "~/postgres/db";
import { z } from "zod";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { SecureToken } from "~/lib/secure-token";
import { ensureViewerMiddleware } from "~/middleware/auth-middleware";
import { invariant } from "@tanstack/react-router";

async function generateTxId(tx: PgTx): Promise<number> {
  // The ::xid cast strips off the epoch, giving you the raw 32-bit value
  // that matches what PostgreSQL sends in logical replication streams
  // (and then exposed through Electric which we'll match against
  // in the client).
  const result = await tx.execute(
    sql`SELECT pg_current_xact_id()::xid::text as txid`,
  );
  const txid = result.rows[0]?.txid;

  if (txid === undefined) {
    throw new Error(`Failed to get transaction ID`);
  }

  return parseInt(txid as string, 10);
}

/**
 * Create workspace
 */
export const createWorkspaceSF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .validator(z.array(z.object({ name: z.string() })))
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

      return { txid };
    });

    return result;
  });

/**
 * Update workspace
 */
export const updateWorkspaceSF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .validator(z.array(z.object({ id: SecureToken, name: z.string() })))
  .handler(async ({ data, context }) => {
    context.ensureIsInWorkspace(data.map((item) => item.id));

    const result = await db().transaction(async (tx) => {
      const txid = await generateTxId(tx);

      await Promise.all(
        data.map((item) =>
          tx
            .update(schema.workspaces)
            .set({ name: item.name })
            .where(eq(schema.workspaces.id, item.id)),
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
