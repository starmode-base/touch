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

export function buildWorkspaceGuards(
  workspaceMemberships: {
    workspaceId: string;
    role: WorkspaceMemberRole;
  }[],
) {
  /**
   * Check if the viewer is a user of ALL provided workspace ID(s) (any role)
   */
  const isInWorkspace = (workspaceId: string | string[]): boolean => {
    // Handle non-string, non-array inputs
    if (typeof workspaceId !== "string" && !Array.isArray(workspaceId)) {
      return false;
    }

    const workspaceIds =
      typeof workspaceId === "string" ? [workspaceId] : workspaceId;

    // Empty array should return false - no workspaces to check means no
    // authorization
    if (workspaceIds.length === 0) return false;

    const memberWorkspaceIds = new Set(
      workspaceMemberships.map((membership) => membership.workspaceId),
    );

    return workspaceIds.every(
      (id) => typeof id === "string" && memberWorkspaceIds.has(id),
    );
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
    // Handle non-string, non-array inputs
    if (typeof workspaceId !== "string" && !Array.isArray(workspaceId)) {
      return false;
    }

    const workspaceIds =
      typeof workspaceId === "string" ? [workspaceId] : workspaceId;

    // Empty array should return false - no workspaces to check means no
    // authorization
    if (workspaceIds.length === 0) return false;

    return workspaceIds.every(
      (id) =>
        typeof id === "string" &&
        workspaceMemberships.some(
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

  return {
    isInWorkspace,
    hasWorkspaceRole,
    ensureIsInWorkspace,
    ensureHasWorkspaceRole,
  };
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

  return next({
    context: {
      viewer: {
        ...viewer,
        workspaceMembershipIds: viewer.workspaceMemberships.map(
          (membership) => membership.workspaceId,
        ),
      },
      ...buildWorkspaceGuards(viewer.workspaceMemberships),
    },
  });
});
