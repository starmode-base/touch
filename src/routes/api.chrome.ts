import { createServerFileRoute } from "@tanstack/react-start/server";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { z } from "zod";
import { db, schema } from "~/postgres/db";
import { and, eq, sql } from "drizzle-orm";
import { linkedinPatternExact } from "~/lib/linkedin-extractor";
import { SecureToken } from "~/lib/secure-token";
import { buildWorkspaceGuards } from "~/middleware/auth-middleware";

const BodySchema = z.object({
  workspaceId: SecureToken,
  linkedin: z.string().trim().regex(linkedinPatternExact).max(64),
  name: z.string().trim().max(64),
});

type BodySchema = z.infer<typeof BodySchema>;

export const ServerRoute = createServerFileRoute("/api/chrome").methods({
  POST: async ({ request }) => {
    console.log("POST /api/chrome");
    const { userId } = await getAuth(request);

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    let body: BodySchema;
    try {
      body = BodySchema.parse(await request.json());
      console.log("body", body);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid body" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const viewer = await db().query.users.findFirst({
      where: eq(schema.users.clerkUserId, userId),
      with: { workspaceMemberships: true },
    });

    if (!viewer) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const { ensureIsInWorkspace } = buildWorkspaceGuards(
      viewer.workspaceMemberships,
    );

    try {
      ensureIsInWorkspace(body.workspaceId);
    } catch {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const result = await db().transaction(async (tx) => {
      // Try to create the contact first
      const [created] = await tx
        .insert(schema.contacts)
        .values({
          workspaceId: body.workspaceId,
          name: body.name,
          linkedin: body.linkedin,
        })
        .onConflictDoNothing({
          target: [schema.contacts.workspaceId, schema.contacts.linkedin],
        })
        .returning({ id: schema.contacts.id });

      if (created) {
        console.log("created", created);

        const details = { name: body.name, linkedin: body.linkedin };
        await tx.insert(schema.contactActivities).values({
          workspaceId: body.workspaceId,
          contactId: created.id,
          createdById: viewer.id,
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
          name: body.name,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(schema.contacts.workspaceId, body.workspaceId),
            eq(schema.contacts.linkedin, body.linkedin),
            sql`${schema.contacts.name} IS DISTINCT FROM ${body.name}`,
          ),
        )
        .returning({ id: schema.contacts.id });
      console.log("updated", updated);

      if (updated) {
        const details = { name: body.name, linkedin: body.linkedin };
        await tx.insert(schema.contactActivities).values({
          workspaceId: body.workspaceId,
          contactId: updated.id,
          createdById: viewer.id,
          kind: "system:updated",
          body: JSON.stringify(details),
          details,
        });

        return { mode: "updated" as const, contactId: updated.id };
      }

      // No change needed (name already the same)
      return { mode: "noop" as const };
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  },
});
