import { createServerFn } from "@tanstack/react-start";
import { db, schema } from "~/postgres/db";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";

export const createWorkspaceSF = createServerFn({ method: "POST" })
  .validator(z.object({ name: z.string() }))
  .handler(async ({ data }) => {
    const workspace = await db()
      .insert(schema.workspaces)
      .values({ name: data.name })
      .returning();

    return workspace;
  });

export const updateWorkspaceSF = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), name: z.string() }))
  .handler(async ({ data }) => {
    const workspace = await db()
      .update(schema.workspaces)
      .set({ name: data.name })
      .where(eq(schema.workspaces.id, data.id))
      .returning();

    return workspace;
  });

export const getWorkspacesSF = createServerFn({ method: "GET" }).handler(
  async () => {
    const workspaces = await db()
      .select()
      .from(schema.workspaces)
      .orderBy(asc(schema.workspaces.createdAt));
    return workspaces;
  },
);
