import {
  clerkClient,
  getAuth,
  type User as ClerkUser,
} from "@clerk/tanstack-react-start/server";
import { invariant } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "~/postgres/db";

/**
 * Fetch the clerk user id from the Clerk API
 */
async function fetchClerkUserId(request: Request) {
  const session = await getAuth(request);

  return session.userId;
}

/**
 * Fetch the clerk user from the Clerk API
 *
 * This is about 10x slower than fetchClerkUserId, so we only use it when
 * we need to get the user's email address.
 */
async function fetchClerkUser(clerkUserId: string) {
  return clerkClient().users.getUser(clerkUserId);
}

/**
 * Get the primary email address from a clerk user
 */
function requireClerkPrimaryEmailAddress(clerkUser: ClerkUser) {
  const email = clerkUser.primaryEmailAddress?.emailAddress;

  // Users always have an email address since we're using the email address to
  // sign up/in
  invariant(email, "Failed to get primary email address");

  return email;
}

/**
 * Get the viewer from the database
 */
async function selectViewer(clerkUserId: string) {
  const viewer = await db().query.users.findFirst({
    where: eq(schema.users.clerkUserId, clerkUserId),
  });

  return viewer ?? null;
}

/**
 * Upsert the viewer in the database from the Clerk API
 */
async function upsertViewer(clerkUserId: string) {
  const clerkUser = await fetchClerkUser(clerkUserId);
  const email = requireClerkPrimaryEmailAddress(clerkUser);

  const [viewer] = await db()
    .insert(schema.users)
    .values({ clerkUserId, email })
    .onConflictDoUpdate({
      target: [schema.users.clerkUserId],
      set: { email, updatedAt: sql`now()` },
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

  // Get the current clerk user id
  const clerkUserId = await fetchClerkUserId(getWebRequest());

  if (!clerkUserId) {
    return null;
  }

  // Upsert and return the updated viewer
  return upsertViewer(clerkUserId);
}

/**
 * Middleware to ensure the viewer is signed in and has a viewer record in the
 * database.
 */
export const ensureViewerMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  // Get the current clerk user id
  const clerkUserId = await fetchClerkUserId(getWebRequest());

  if (!clerkUserId) {
    throw new Error("Unauthorized");
  }

  const viewer = await selectViewer(clerkUserId);

  if (!viewer) {
    throw new Error("Unauthorized");
  }

  return next({ context: { viewer } });
});
