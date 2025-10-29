import { createServerFn } from "@tanstack/react-start";
import { db, schema } from "~/postgres/db";
import { z } from "zod";
import { ensureViewerMiddleware } from "~/middleware/auth-middleware";
import { generateTxId } from "~/postgres/helpers";
import { and, eq } from "drizzle-orm";
import { SecureToken } from "~/lib/validators";

/**
 * Validation schema for creating a contact role assignment
 */
export const createContactRoleAssignmentInputSchema = z.object({
  contactId: SecureToken,
  contactRoleId: SecureToken,
});

/**
 * Create contact role assignment
 */
export const createContactRoleAssignmentSF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .inputValidator(createContactRoleAssignmentInputSchema)
  .handler(async ({ data, context }) => {
    return db().transaction(async (tx) => {
      const txid = await generateTxId(tx);

      await tx
        .insert(schema.contactRoleAssignments)
        .values({
          ...data,
          userId: context.viewer.id,
        })
        .returning();

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
      contactId: SecureToken,
      contactRoleId: SecureToken,
    }),
  )
  .handler(async ({ data, context }) => {
    return db().transaction(async (tx) => {
      const txid = await generateTxId(tx);
      await tx.delete(schema.contactRoleAssignments).where(
        and(
          // TODO: Consider adding a surrogate primary key to the table
          eq(schema.contactRoleAssignments.userId, context.viewer.id),
          eq(schema.contactRoleAssignments.contactId, data.contactId),
          eq(schema.contactRoleAssignments.contactRoleId, data.contactRoleId),
        ),
      );
      return { txid };
    });
  });
