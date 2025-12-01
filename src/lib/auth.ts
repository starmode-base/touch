import { eq, sql } from "drizzle-orm";
import { db, schema } from "~/postgres/db";
import { memoizeAsync } from "./memoize";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { lazySingleton } from "~/lib/singleton";

// Lazy initialization to avoid calling db() at module load time (breaks tests)
export const auth = lazySingleton(() =>
  betterAuth({
    database: drizzleAdapter(db(), {
      provider: "pg",
    }),
    plugins: [
      emailOTP({
        async sendVerificationOTP({ email, otp, type }) {
          if (type === "sign-in") {
            console.log("sign-in⚡️", type, email, otp);
            // Send the OTP for sign in
          } else if (type === "email-verification") {
            console.log("email-verification⚡️", type, email, otp);
            // Send the OTP for email verification
          } else {
            console.log("forget-password⚡️", type, email, otp);
            // Send the OTP for password reset
          }
          return Promise.resolve();
        },
      }),
    ],
  }),
);

/**
 * Viewer type
 */
export interface Viewer {
  id: string;
  email: string;
}

/**
 * Get the the user session
 */
const getSession = async () => {
  const session = await auth().api.getSession({
    headers: getRequestHeaders(),
  });

  if (!session) {
    return null;
  }

  return { id: session.user.id, email: session.user.email };
};

/**
 * Get the viewer (the current user)
 */
async function getViewer(userId: string): Promise<Viewer | null> {
  const user = await db().query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: {
      id: true,
      email: true,
    },
  });

  if (!user) {
    return null;
  }

  const viewer = {
    id: user.id,
    email: user.email,
  };

  return viewer;
}

/**
 * Upsert the viewer in the database from the Clerk API
 *
 * This syncs the user's email from Clerk to our database.
 * Returns the internal user ID.
 */
async function upsertViewer(clerkUser: {
  id: string;
  email: string;
}): Promise<string> {
  const [user] = await db()
    .insert(schema.users)
    .values({
      clerk_user_id: clerkUser.id,
      email: clerkUser.email,
    })
    .onConflictDoUpdate({
      target: [schema.users.clerk_user_id],
      set: {
        email: clerkUser.email,
        // Only update the updatedAt field if the email is different
        updated_at: sql`case when excluded.email is distinct from ${schema.users.email} then now() else ${schema.users.updated_at} end`,
      },
    })
    .returning({ id: schema.users.id });

  if (!user) {
    throw new Error("Failed to sync user");
  }

  return user.id;
}

/**
 * Memoize the getViewer function
 */
const getViewerMemoized = memoizeAsync(getViewer, 5000, (userId) => userId);

/**
 * Memoize the upsertViewer function
 */
const upsertViewerMemoized = memoizeAsync(
  upsertViewer,
  5000,
  (session) => session.id + session.email,
);

/**
 * Sync the Clerk user (email address) with the database and return the viewer
 *
 * Returns the viewer object, or null if the user is not signed in
 */
export async function syncViewer(): Promise<Viewer | null> {
  const clerkUser = await getSession();

  if (!clerkUser) {
    return null;
  }

  const userId = await upsertViewerMemoized(clerkUser);
  const viewer = await getViewerMemoized(userId);

  return viewer;
}

/**
 * Clear a specific user's viewer cache
 *
 * IMPORTANT: Call this after operations that change fields returned by syncViewer().
 */
export function clearViewerCache(userId: string) {
  getViewerMemoized.clear(userId);
}

/**
 * Clear all viewer caches
 *
 * For test cleanup only. Call after deleting users from the database.
 */
export function clearAllViewerCaches() {
  getViewerMemoized.clear();
  upsertViewerMemoized.clear();
}
