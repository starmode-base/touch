import { db } from "~/postgres/db";
import { memoizeAsync } from "./memoize";
import { getCookie, getRequestHeaders } from "@tanstack/react-start/server";
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
    user: {
      modelName: "users",
    },
    session: {
      modelName: "sessions",
    },
    verification: {
      modelName: "otps",
    },
    account: {
      modelName: "accounts",
    },
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
 * Get the viewer (the current user)
 */
const getSession = memoizeAsync(
  async (cookie: string) => {
    if (!cookie) {
      return null;
    }

    const session = await auth().api.getSession({
      headers: getRequestHeaders(),
    });

    if (!session) {
      return null;
    }

    return session.user;
  },
  5000,
  (cookie) => cookie,
);

/**
 * Sync the Clerk user (email address) with the database and return the viewer
 *
 * Returns the viewer object, or null if the user is not signed in
 */
export async function getViewer(): Promise<Viewer | null> {
  const cookie = getCookie("better-auth.session_token");

  if (!cookie) {
    return null;
  }

  const user = await getSession(cookie);

  if (!user) {
    return null;
  }

  return user;
}

/**
 * Clear a specific user's viewer cache
 *
 * IMPORTANT: Call this after operations that change fields returned by syncViewer().
 */
export function clearViewerCache(userId: string) {
  getSession.clear(userId);
}

/**
 * Clear all viewer caches
 *
 * For test cleanup only. Call after deleting users from the database.
 */
export function clearAllViewerCaches() {
  getSession.clear();
}
