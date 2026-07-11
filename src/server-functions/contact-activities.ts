import { createServerFn } from "@tanstack/react-start";
import { db, schema } from "#postgres/db";
import { eq } from "drizzle-orm";
import { ensureViewerMiddleware } from "#middleware/auth-middleware";

/**
 * List contact activities
 */
export const listContactActivitiesSF = createServerFn({ method: "GET" })
  .middleware([ensureViewerMiddleware])
  .handler(async ({ context }) => {
    return db()
      .select()
      .from(schema.contactActivities)
      .where(eq(schema.contactActivities.user_id, context.viewer.id));
  });
