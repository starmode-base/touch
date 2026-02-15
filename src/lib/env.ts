/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { env } from "cloudflare:workers";
import { z } from "zod";

export const ensureEnv = () => {
  console.log(
    "ensureEnv|process.env.DATABASE_URL",
    typeof process?.env?.DATABASE_URL,
  );
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore

  console.log("ensureEnv|env.DATABASE_URL", env && typeof env?.DATABASE_URL);

  return z
    .object({
      DATABASE_URL: z.string(),
      //   NEON_API_KEY: z.string(),
      //   NEON_PROJECT_ID: z.string(),
      //   ELECTRIC_SOURCE_ID: z.string(),
      //   ELECTRIC_SOURCE_SECRET: z.string(),
    })
    .parse(env);
};
