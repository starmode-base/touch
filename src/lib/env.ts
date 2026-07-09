import { z } from "zod";

/**
 * Validate and return the server environment variables
 */
export const ensureEnv = () =>
  z
    .object({
      DATABASE_URL: z.string(),
      ELECTRIC_SOURCE_ID: z.string(),
      ELECTRIC_SOURCE_SECRET: z.string(),
    })
    .parse(process.env);
