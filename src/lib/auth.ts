import { getAuth } from "@clerk/tanstack-react-start/server";
import { eq } from "drizzle-orm";
import { db, schema } from "~/postgres/db";

/**
 * Fetch the clerk user id from the Clerk API
 */
async function fetchClerkUserId(request: Request) {
  const session = await getAuth(request);

  return session.userId;
}

/**
 * Get the viewer from the database
 */
export async function getViewer(request: Request) {
  const clerkUserId = await fetchClerkUserId(request);

  if (!clerkUserId) {
    return null;
  }

  const viewer = await db().query.users.findFirst({
    where: eq(schema.users.clerkUserId, clerkUserId),
    with: {
      workspaceMemberships: true,
    },
  });

  return viewer
    ? {
        ...viewer,
        workspaceMembershipIds: viewer.workspaceMemberships.map(
          (membership) => membership.workspaceId,
        ),
      }
    : null;
}
