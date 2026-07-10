import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  NEON_API_KEY: z.string(),
  NEON_PROJECT_ID: z.string(),
});

/**
 * Validate and return the Node-side environment variables, used by tests and
 * tooling. The app itself reads Cloudflare bindings instead (see
 * src/postgres/db.ts).
 *
 * Read lazily (not at module load) so tools that set environment variables at
 * runtime are respected — e.g. neon-testing swaps DATABASE_URL to a fresh Neon
 * branch per test file.
 */
export const ensureEnv = () => envSchema.parse(process.env);
