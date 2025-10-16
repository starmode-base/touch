import { auth } from "@clerk/tanstack-react-start/server";

/**
 * Fetch the clerk user from the Clerk API
 */
export const getClerkUser = async (request: Request) => {
  const { sessionClaims, userId: id, isAuthenticated } = await auth();

  const email = sessionClaims?.email;

  if (typeof email !== "string") {
    console.warn(
      "No email found in claims, see https://clerk.com/docs/backend-requests/custom-session-token",
    );

    return null;
  }

  if (!isAuthenticated || !id) {
    return null;
  }

  return { id, email };
};
