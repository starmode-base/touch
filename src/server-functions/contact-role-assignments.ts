import { createServerFn } from "@tanstack/react-start";
import { db, schema } from "~/postgres/db";
import { z } from "zod";
import { ensureViewerMiddleware } from "~/middleware/auth-middleware";
import { and, eq } from "drizzle-orm";
import { SecureToken } from "~/lib/validators";
import invariant from "tiny-invariant";

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
  .validator(createContactRoleAssignmentInputSchema)
  .handler(async ({ data, context }) => {
    // Return the created row so the client can write it back without a
    // refetch
    const [assignment] = await db()
      .insert(schema.contactRoleAssignments)
      .values({
        contact_id: data.contactId,
        contact_role_id: data.contactRoleId,
        user_id: context.viewer.id,
      })
      .returning();
    invariant(assignment, "Failed to create contact role assignment");

    return assignment;
  });

/**
 * Delete contact role assignment
 */
export const deleteContactRoleAssignmentSF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .validator(
    z.object({
      contactId: SecureToken,
      contactRoleId: SecureToken,
    }),
  )
  .handler(async ({ data, context }) => {
    await db()
      .delete(schema.contactRoleAssignments)
      .where(
        and(
          // TODO: Consider adding a surrogate primary key to the table
          eq(schema.contactRoleAssignments.user_id, context.viewer.id),
          eq(schema.contactRoleAssignments.contact_id, data.contactId),
          eq(schema.contactRoleAssignments.contact_role_id, data.contactRoleId),
        ),
      );
  });

/**
 * List contact role assignments
 */
export const listContactRoleAssignmentsSF = createServerFn({ method: "GET" })
  .middleware([ensureViewerMiddleware])
  .handler(async ({ context }) => {
    return db()
      .select()
      .from(schema.contactRoleAssignments)
      .where(eq(schema.contactRoleAssignments.user_id, context.viewer.id));
  });
