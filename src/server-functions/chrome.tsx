import { createServerFn } from "@tanstack/react-start";
import { db, schema } from "~/postgres/db";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { SecureToken } from "~/lib/secure-token";
import { ensureViewerMiddleware } from "~/middleware/auth-middleware";
import { invariant } from "@tanstack/react-router";
import { generateTxId } from "~/postgres/helpers";
import { linkedinPatternExact } from "~/lib/linkedin-extractor";

/**
 * Upsert contact by LinkedIn URL
 * - If a contact exists in the workspace with the LinkedIn URL, update the name
 *   only if the existing name is empty
 * - Otherwise create a new contact
 */
export const upsertContact = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .validator(
    z.object({
      workspaceId: SecureToken,
      linkedin: z.string().trim().regex(linkedinPatternExact).max(64),
      name: z.string().trim().max(64),
    }),
  )
  .handler(async ({ data, context }) => {
    context.ensureIsInWorkspace(data.workspaceId);

    const normalizedName = data.name;

    return db().transaction(async (tx) => {
      const txid = await generateTxId(tx);

      const existing = await tx.query.contacts.findFirst({
        where: and(
          eq(schema.contacts.workspaceId, data.workspaceId),
          eq(schema.contacts.linkedin, data.linkedin),
        ),
        columns: { id: true, name: true },
      });

      if (existing) {
        const shouldUpdateName =
          normalizedName.length > 0 && existing.name.trim().length === 0;

        if (!shouldUpdateName) {
          return { txid, contactId: existing.id, mode: "noop" as const };
        }

        const [updated] = await tx
          .update(schema.contacts)
          .set({ name: normalizedName })
          .where(eq(schema.contacts.id, existing.id))
          .returning();
        invariant(updated, "Failed to update contact");

        const changes = { name: updated.name, linkedin: data.linkedin };
        await tx.insert(schema.contactActivities).values({
          workspaceId: data.workspaceId,
          contactId: updated.id,
          createdById: context.viewer.id,
          kind: "system:updated",
          body: JSON.stringify(changes),
          details: changes,
        });

        return { txid, contactId: updated.id, mode: "updated" as const };
      }

      const nameForCreate =
        normalizedName.length > 0
          ? normalizedName
          : (() => {
              try {
                const u = new URL(data.linkedin);
                const slug = u.pathname.split("/").filter(Boolean)[1] ?? "";
                return slug.slice(0, 64) || "Contact";
              } catch {
                return "Contact";
              }
            })();

      const created = await tx
        .insert(schema.contacts)
        .values({
          workspaceId: data.workspaceId,
          name: nameForCreate,
          linkedin: data.linkedin,
        })
        .onConflictDoNothing({
          target: [schema.contacts.workspaceId, schema.contacts.linkedin],
        })
        .returning({ id: schema.contacts.id });

      if (created.length === 0) {
        // Race: someone else inserted concurrently
        return { txid, mode: "noop" as const };
      }

      return { txid, mode: "created" as const };
    });
  });
