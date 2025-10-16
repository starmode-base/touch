import { sql } from "drizzle-orm";
import { db, schema } from "~/postgres/db";
import { getClerkUser } from "~/auth/clerk";

/**
 * Upsert the viewer in the database from the Clerk API
 */
async function upsertViewer(clerkUser: { id: string; email: string }) {
  const [viewer] = await db()
    .insert(schema.users)
    .values({ clerkUserId: clerkUser.id, email: clerkUser.email })
    .onConflictDoUpdate({
      target: [schema.users.clerkUserId],
      set: { email: clerkUser.email, updatedAt: sql`now()` },
    })
    .returning();

  return viewer ?? null;
}

/**
 * Sync the Clerk user (email address) with the database and return the viewer,
 * or null if the user is not signed in.
 */
export async function syncViewer() {
  console.debug("syncViewer");

  // Get the current clerk user
  const clerkUser = await getClerkUser();

  if (!clerkUser) {
    return null;
  }

  // Upsert and return the updated viewer
  return upsertViewer(clerkUser);
}
