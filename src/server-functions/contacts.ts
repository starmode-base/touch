import { createServerFn } from "@tanstack/react-start";
import { db, schema } from "~/postgres/db";
import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  ContactName,
  ContactNameEncrypted,
  LinkedInUrl,
  SecureToken,
} from "~/lib/validators";
import { ensureViewerMiddleware } from "~/middleware/auth-middleware";
import invariant from "tiny-invariant";
import { generateTxId } from "~/postgres/helpers";

/**
 * Validation schema for creating a contact (for server-side validation)
 */
export const createContactInputSchemaEncrypted = z.object({
  workspaceId: SecureToken,
  name: ContactNameEncrypted,
  linkedin: LinkedInUrl.nullable(),
});

/**
 * Validation schema for creating a contact (for client-side form validation)
 */
export const createContactInputSchema =
  createContactInputSchemaEncrypted.extend({
    name: ContactName,
  });

/**
 * Create contact
 */
export const createContactSF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .inputValidator(z.array(createContactInputSchemaEncrypted))
  .handler(async ({ data, context }) => {
    context.ensureIsInWorkspace(data.map((item) => item.workspaceId));

    return db().transaction(async (tx) => {
      const txid = await generateTxId(tx);

      // Create each contact in the same transaction
      await Promise.all(
        data.map(async (item) => {
          // Create contact
          const [contact] = await tx
            .insert(schema.contacts)
            .values(item)
            .returning();
          invariant(contact, "Failed to create contact");

          const changes = {
            name: item.name,
            linkedin: item.linkedin,
          };

          // Create contact activity
          await tx.insert(schema.contactActivities).values({
            workspaceId: item.workspaceId,
            contactId: contact.id,
            createdById: context.viewer.id,
            kind: "system:created",
            body: JSON.stringify(changes),
            details: changes,
          });
        }),
      );

      return txid;
    });
  });

/**
 * Update contact
 */
export const updateContactSF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .inputValidator(
    z.array(
      z.object({
        key: z.object({
          id: SecureToken,
        }),
        fields: z.object({
          name: createContactInputSchemaEncrypted.shape.name,
          linkedin: createContactInputSchemaEncrypted.shape.linkedin,
        }),
      }),
    ),
  )
  .handler(async ({ data, context }) => {
    return db().transaction(async (tx) => {
      const txid = await generateTxId(tx);

      // Get all workspace IDs for authorization check
      const contactIds = data.map((item) => item.key.id);
      const contactWorkspaceIds = await tx.query.contacts
        .findMany({
          where: inArray(schema.contacts.id, contactIds),
          columns: {
            id: true,
            workspaceId: true,
          },
        })
        .then((contacts) => {
          const workspaceMap = new Map(
            contacts.map((c) => [c.id, c.workspaceId]),
          );
          return {
            workspaceMap,
            workspaceIds: contacts.map((c) => c.workspaceId),
          };
        });

      // Ensure the user is in all workspaces
      context.ensureIsInWorkspace(contactWorkspaceIds.workspaceIds);

      // Update each contact in the same transaction
      await Promise.all(
        data.map(async (item) => {
          const contactWorkspaceId = contactWorkspaceIds.workspaceMap.get(
            item.key.id,
          );
          invariant(contactWorkspaceId, "Contact not found");

          // Update contact
          const [contact] = await tx
            .update(schema.contacts)
            .set(item.fields)
            .where(eq(schema.contacts.id, item.key.id))
            .returning();
          invariant(contact, "Failed to update contact");

          const changes = {
            name: item.fields.name,
            linkedin: item.fields.linkedin,
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
        }),
      );

      return txid;
    });
  });

/**
 * Validation schema for upserting a contact (for server-side validation)
 */
export const upsertContactInputSchemaEncrypted = z.object({
  workspaceId: SecureToken,
  name: ContactNameEncrypted,
  linkedin: LinkedInUrl,
});

/**
 * Validation schema for upserting a contact (for client-side form validation)
 */
export const upsertContactInputSchema =
  upsertContactInputSchemaEncrypted.extend({
    name: ContactName,
  });

/**
 * Upsert contact
 *
 * Creates a contact if it doesn't exist, otherwise updates the name if the
 * LinkedIn URL is the same.
 */
export const upsertContactSF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .inputValidator(upsertContactInputSchemaEncrypted)
  .handler(async ({ data, context }) => {
    context.ensureIsInWorkspace(data.workspaceId);

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
  .inputValidator(z.object({ ids: SecureToken.array() }))
  .handler(async ({ data, context }) => {
    return db().transaction(async (tx) => {
      const txid = await generateTxId(tx);

      const contactWorkspaceIds = await tx.query.contacts
        .findMany({
          where: inArray(schema.contacts.id, data.ids),
          columns: {
            workspaceId: true,
          },
        })
        .then((contacts) => contacts.map((contact) => contact.workspaceId));

      // Ensure the user is in the workspace
      context.ensureIsInWorkspace(contactWorkspaceIds);

      await tx
        .delete(schema.contacts)
        .where(inArray(schema.contacts.id, data.ids));

      return txid;
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
