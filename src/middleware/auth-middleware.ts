import { getAuth } from "@clerk/tanstack-react-start/server";
import { createMiddleware } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { db, schema } from "~/postgres/db";
import type { WorkspaceMemberRole } from "~/postgres/schema";

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
async function selectViewer(clerkUserId: string) {
  const viewer = await db().query.users.findFirst({
    where: eq(schema.users.clerkUserId, clerkUserId),
    with: {
      workspaceMemberships: true,
    },
  });

  return viewer ?? null;
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

  /**
   * Check if the viewer is a user of ALL provided workspace ID(s) (any role)
   */
  const isInWorkspace = (workspaceId: string | string[]): boolean => {
    const workspaceIds =
      typeof workspaceId === "string" ? [workspaceId] : workspaceId;

    const memberWorkspaceIds = new Set(
      viewer.workspaceMemberships.map((membership) => membership.workspaceId),
    );

    return workspaceIds.every((id) => memberWorkspaceIds.has(id));
  };

  /**
   * Ensure the viewer is a user of ALL the provided workspace ID(s) (any role)
   */
  const ensureIsInWorkspace = (workspaceId: string | string[]) => {
    if (!isInWorkspace(workspaceId)) throw new Error("Unauthorized");
  };

  /**
   * Check if the viewer has the provided role in ALL the provided workspace
   * ID(s)
   */
  const hasWorkspaceRole = (
    workspaceId: string | string[],
    role: WorkspaceMemberRole,
  ): boolean => {
    const workspaceIds =
      typeof workspaceId === "string" ? [workspaceId] : workspaceId;

    return workspaceIds.every((id) =>
      viewer.workspaceMemberships.some(
        (membership) =>
          membership.workspaceId === id && membership.role === role,
      ),
    );
  };

  /**
   * Ensure the viewer has the provided role in ALL the provided workspace
   * ID(s)
   */
  const ensureHasWorkspaceRole = (
    workspaceId: string | string[],
    role: WorkspaceMemberRole,
  ) => {
    if (!hasWorkspaceRole(workspaceId, role)) throw new Error("Unauthorized");
  };

  return next({
    context: {
      viewer,
      isInWorkspace,
      hasWorkspaceRole,
      ensureIsInWorkspace,
      ensureHasWorkspaceRole,
    },
  });
});
