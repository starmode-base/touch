import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string(),
});

/**
 * Validate and return the server environment variables
 *
 * https://tanstack.com/start/latest/docs/framework/react/guide/environment-variables#runtime-validation
 *
 * Read lazily (not at module load) so tools that set environment variables at
 * runtime are respected — e.g. neon-testing swaps DATABASE_URL to a fresh Neon
 * branch per test file.
 */
export const ensureEnv = () => envSchema.parse(process.env);
