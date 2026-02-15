/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
// @ts-ignore
import { env } from "cloudflare:workers";
import { z } from "zod";

export const ensureEnv = () => {
  console.log(
    "ensureEnv|process.env.DATABASE_URL",
    typeof process?.env?.DATABASE_URL,
  );
  console.log(
    "ensureEnv|env.DATABASE_URL",
    // @ts-ignore
    typeof env !== "undefined" && typeof env?.DATABASE_URL,
  );

  return (
    z
      .object({
        DATABASE_URL: z.string(),
        //   NEON_API_KEY: z.string(),
        //   NEON_PROJECT_ID: z.string(),
        ELECTRIC_SOURCE_ID: z.string(),
        ELECTRIC_SOURCE_SECRET: z.string(),
      })
      // @ts-ignore
      .parse(env)
  );
};
