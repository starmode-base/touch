import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "~/postgres/db";

export const auth = betterAuth({
  database: drizzleAdapter(db(), {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
  },
  emailVerification: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sendVerificationEmail: async ({ user, url, token }, request) => {
      console.log("sendVerificationEmail⚡️", user);
      console.log("sendVerificationEmail⚡️", url);
      console.log("sendVerificationEmail⚡️", token);

      // await sendEmail({
      //   to: user.email,
      //   subject: "Verify your email address",
      //   text: `Click the link to verify your email: ${url}`,
      // });

      return Promise.resolve();
    },
  },
});
