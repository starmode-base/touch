import { createServerFn } from "@tanstack/react-start";
import { db, schema } from "#postgres/db";
import { eq } from "drizzle-orm";
import { ensureViewerMiddleware } from "#middleware/auth-middleware";

/**
 * List contact roles
 */
export const listContactRolesSF = createServerFn({ method: "GET" })
  .middleware([ensureViewerMiddleware])
  .handler(async ({ context }) => {
    return db()
      .select()
      .from(schema.contactRoles)
      .where(eq(schema.contactRoles.user_id, context.viewer.id));
  });
