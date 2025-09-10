import { createServerFn } from "@tanstack/react-start";
import { db, schema } from "~/postgres/db";
import { z } from "zod";
import { eq } from "drizzle-orm";
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

      // Create contact
      const [contact] = await tx
        .insert(schema.contacts)
        .values(data)
        .returning();
      invariant(contact, "Failed to create contact");

      const changes = {
        name: data.name,
        linkedin: data.linkedin,
      };

      // Create contact activity
      await tx.insert(schema.contactActivities).values({
        workspaceId: data.workspaceId,
        contactId: contact.id,
        createdById: context.viewer.id,
        kind: "system:created",
        body: JSON.stringify(changes),
        details: changes,
      });

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

      // Update contact
      const [contact] = await tx
        .update(schema.contacts)
        .set(data.fields)
        .where(eq(schema.contacts.id, data.key.id))
        .returning();
      invariant(contact, "Failed to update contact");

      const changes = {
        name: data.fields.name,
        linkedin: data.fields.linkedin,
      };

      // Create contact activity
      await tx.insert(schema.contactActivities).values({
        workspaceId: contactWorkspaceId,
        contactId: contact.id,
        createdById: context.viewer.id,
        kind: "system:updated",
        body: JSON.stringify(changes),
        details: changes,
      });

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
