import { createMiddleware } from "@tanstack/react-start";
import { syncViewer } from "~/lib/auth";
import type { WorkspaceMemberRole } from "~/postgres/schema";

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
  const viewer = await syncViewer();

  if (!viewer) {
    throw new Error("Unauthorized");
  }

  return next({
    context: {
      viewer,
      ...buildWorkspaceGuards(viewer.workspaceMemberships),
    },
  });
});
