import { createServerFn } from "@tanstack/react-start";
import { db, schema } from "~/postgres/db";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { SecureToken } from "~/lib/secure-token";
import { ensureViewerMiddleware } from "~/middleware/auth-middleware";
import { invariant } from "@tanstack/react-router";
import { generateTxId } from "~/postgres/helpers";

/**
 * Validation schema for creating a contact
 */
export const createContactInputSchema = z.object({
  workspaceId: SecureToken,
  name: z.string().nonempty().max(64),
  linkedin: z.string().nonempty().max(64).nullable(),
});

/**
 * Create contact
 */
export const createContactSF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .validator(createContactInputSchema)
  .handler(async ({ data, context }) => {
    context.ensureIsInWorkspace(data.workspaceId);

    return db().transaction(async (tx) => {
      const txid = await generateTxId(tx);

      await tx.insert(schema.contacts).values(data).returning();

      return { txid };
    });
  });

/**
 * Update contact
 */
export const updateContactSF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .validator(
    z.object({
      key: z.object({
        id: SecureToken,
      }),
      fields: z.object({
        name: createContactInputSchema.shape.name,
        linkedin: createContactInputSchema.shape.linkedin,
      }),
    }),
  )
  .handler(async ({ data, context }) => {
    const result = await db().transaction(async (tx) => {
      const txid = await generateTxId(tx);

      const contactWorkspaceId = await tx.query.contacts
        .findFirst({
          where: eq(schema.contacts.id, data.key.id),
          columns: {
            workspaceId: true,
          },
        })
        .then((contact) => contact?.workspaceId);
      invariant(contactWorkspaceId, "Unauthorized");

      // Ensure the user is in the workspace
      context.ensureIsInWorkspace(contactWorkspaceId);

      await tx
        .update(schema.contacts)
        .set(data.fields)
        .where(eq(schema.contacts.id, data.key.id))
        .returning();

      return { txid };
    });

    return result;
  });

/**
 * Delete contact
 */
export const deleteContactSF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .validator(z.object({ id: SecureToken }))
  .handler(async ({ data, context }) => {
    return db().transaction(async (tx) => {
      const txid = await generateTxId(tx);

      const contactWorkspaceId = await tx.query.contacts
        .findFirst({
          where: eq(schema.contacts.id, data.id),
          columns: {
            workspaceId: true,
          },
        })
        .then((contact) => contact?.workspaceId);
      invariant(contactWorkspaceId, "Unauthorized");

      // Ensure the user is in the workspace
      context.ensureIsInWorkspace(contactWorkspaceId);

      await tx.delete(schema.contacts).where(eq(schema.contacts.id, data.id));

      return { txid };
    });
  });

/**
 * List contacts
 */
export const listContactsSF = createServerFn({ method: "GET" })
  .middleware([ensureViewerMiddleware])
  .validator(z.object({ workspaceId: z.string() }))
  .handler(async ({ data, context }) => {
    context.ensureIsInWorkspace(data.workspaceId);

    return db()
      .select()
      .from(schema.contacts)
      .where(eq(schema.contacts.workspaceId, data.workspaceId))
      .orderBy(desc(schema.contacts.createdAt), desc(schema.contacts.id));
  });
