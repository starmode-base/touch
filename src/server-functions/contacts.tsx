import { createServerFn } from "@tanstack/react-start";
import { db, schema } from "~/postgres/db";
import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";
import { SecureToken } from "~/lib/secure-token";
import { ensureViewerMiddleware } from "~/middleware/auth-middleware";
import { invariant } from "@tanstack/react-router";
import { generateTxId } from "~/postgres/helpers";
import { linkedinPatternExact } from "~/lib/linkedin-extractor";

/**
 * Validation schema for creating a contact
 */
export const createContactInputSchema = z.object({
  workspaceId: SecureToken,
  name: z.string().trim().nonempty().max(64),
  linkedin: z.string().trim().regex(linkedinPatternExact).max(64).nullable(),
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
 * Validation schema for creating a contact
 */
export const upsertContactInputSchema = z.object({
  workspaceId: SecureToken,
  name: z.string().trim().nonempty().max(64),
  linkedin: z.string().trim().regex(linkedinPatternExact).max(64),
});

/**
 * Upsert contact
 *
 * Creates a contact if it doesn't exist, otherwise updates the name if the
 * LinkedIn URL is the same.
 */
export const upsertContactSF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .validator(upsertContactInputSchema)
  .handler(async ({ data, context }) => {
    context.ensureIsInWorkspace(data.workspaceId);

    console.log("data", data);

    return db().transaction(async (tx) => {
      // Try to create the contact first
      const [created] = await tx
        .insert(schema.contacts)
        .values(data)
        .onConflictDoNothing({
          target: [schema.contacts.workspaceId, schema.contacts.linkedin],
        })
        .returning({ id: schema.contacts.id });

      if (created) {
        const details = { name: data.name, linkedin: data.linkedin };
        await tx.insert(schema.contactActivities).values({
          workspaceId: data.workspaceId,
          contactId: created.id,
          createdById: context.viewer.id,
          kind: "system:created",
          body: JSON.stringify(details),
          details,
        });

        return { mode: "created" as const, contactId: created.id };
      }

      // Contact exists: update name only if it actually changed
      const [updated] = await tx
        .update(schema.contacts)
        .set({
          name: data.name,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(schema.contacts.workspaceId, data.workspaceId),
            eq(schema.contacts.linkedin, data.linkedin),
            sql`${schema.contacts.name} IS DISTINCT FROM ${data.name}`,
          ),
        )
        .returning({ id: schema.contacts.id });

      if (updated) {
        const details = { name: data.name, linkedin: data.linkedin };
        await tx.insert(schema.contactActivities).values({
          workspaceId: data.workspaceId,
          contactId: updated.id,
          createdById: context.viewer.id,
          kind: "system:updated",
          body: JSON.stringify(details),
          details,
        });

        return { mode: "updated" as const, contactId: updated.id };
      }

      // No change needed (name already the same)
      return { mode: "noop" as const };
    });
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

export const listContactsSF = createServerFn({ method: "GET" })
  .middleware([ensureViewerMiddleware])
  .handler(async ({ context }) => {
    return db().query.contacts.findMany({
      where: inArray(
        schema.contacts.workspaceId,
        context.viewer.workspaceMembershipIds,
      ),
    });
  });
