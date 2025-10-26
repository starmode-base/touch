import { createServerFn } from "@tanstack/react-start";
import { db, schema } from "~/postgres/db";
import { z } from "zod";
import { SecureToken } from "~/lib/validators";
import { ensureViewerMiddleware } from "~/middleware/auth-middleware";
import { generateTxId } from "~/postgres/helpers";
import { and, eq } from "drizzle-orm";

/**
 * Validation schema for creating a contact role assignment
 */
export const createContactRoleAssignmentInputSchema = z.object({
  workspaceId: SecureToken,
  contactId: z.string(),
  contactRoleId: z.string(),
});

/**
 * Create contact role assignment
 */
export const createContactRoleAssignmentSF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .inputValidator(createContactRoleAssignmentInputSchema)
  .handler(async ({ data, context }) => {
    context.ensureIsInWorkspace(data.workspaceId);

    return db().transaction(async (tx) => {
      const txid = await generateTxId(tx);

      await tx.insert(schema.contactRoleAssignments).values(data).returning();

      return { txid };
    });
  });

/**
 * Delete contact role assignment
 */
export const deleteContactRoleAssignmentSF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .inputValidator(
    z.object({
      workspaceId: SecureToken,
      contactId: z.string(),
      contactRoleId: z.string(),
    }),
  )
  .handler(async ({ data, context }) => {
    context.ensureIsInWorkspace(data.workspaceId);

    return db().transaction(async (tx) => {
      const txid = await generateTxId(tx);
      await tx.delete(schema.contactRoleAssignments).where(
        and(
          // TODO: Consider adding a surrogate primary key to the table
          eq(schema.contactRoleAssignments.workspaceId, data.workspaceId),
          eq(schema.contactRoleAssignments.contactId, data.contactId),
          eq(schema.contactRoleAssignments.contactRoleId, data.contactRoleId),
        ),
      );
      return { txid };
    });
  });
