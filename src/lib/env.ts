import { env } from "cloudflare:workers";
import { z } from "zod";

export const ensureEnv = () => {
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
