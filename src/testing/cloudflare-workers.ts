import { ensureEnv } from "~/lib/env";

/**
 * Local emulation of the `cloudflare:workers` module for Vitest (aliased in
 * vitest.config.ts) — the test-runner counterpart of wrangler's
 * CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE override for local
 * dev.
 *
 * The getter reads DATABASE_URL lazily because neon-testing points it at a
 * fresh Neon branch per test file.
 */
export const env = {
  HYPERDRIVE: {
    get connectionString() {
      return ensureEnv().DATABASE_URL;
    },
  },
};
