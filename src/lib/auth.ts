import { db } from "~/postgres/db";
import { memoizeAsync } from "./memoize";
import { getCookie, getRequestHeaders } from "@tanstack/react-start/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { lazySingleton } from "~/lib/singleton";
import { createHmac, timingSafeEqual } from "crypto";
import { ensureEnv } from "./env";

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
      // cookieCache: {
      //   enabled: true,
      //   strategy: "compact",
      // },
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
 * Verify a Better Auth session cookie signature
 *
 * @param cookie - The full cookie value (token.signature)
 * @param secret - Your BETTER_AUTH_SECRET
 * @returns The token if valid, null if invalid
 */
export function verifySessionCookie(
  cookie: string,
  secret: string,
): string | null {
  const [token, signature] = cookie.split(".");

  if (!token || !signature) {
    return null;
  }

  // Better Auth uses HMAC-SHA256, then base64url encodes the result
  const expectedSignature = createHmac("sha256", secret)
    .update(token)
    .digest("base64url");

  // Use timing-safe comparison to prevent timing attacks
  try {
    const sigBuffer = Buffer.from(signature, "base64url");
    const expectedBuffer = Buffer.from(expectedSignature, "base64url");

    if (sigBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (timingSafeEqual(sigBuffer, expectedBuffer)) {
      return token;
    }
  } catch {
    return null;
  }

  return null;
}

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
const getUserByCookie = memoizeAsync(
  async (cookie: string) => {
    if (!cookie) {
      return null;
    }

    const session = await auth().api.getSession({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
  console.log("cookie⚡️", cookie);

  if (!cookie) {
    return null;
  }

  const token = verifySessionCookie(cookie, ensureEnv().BETTER_AUTH_SECRET);
  console.log("token⚡️", token);

  const user = await getUserByCookie(cookie);

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
export function clearViewerCache(cookie: string) {
  getUserByCookie.clear(cookie);
}

/**
 * Clear all viewer caches
 *
 * For test cleanup only. Call after deleting users from the database.
 */
export function clearAllViewerCaches() {
  getUserByCookie.clear();
}
