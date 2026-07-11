import "dotenv/config";
import { defineConfig } from "vitest/config";

/**
 * Standalone Vitest config: tests run in Node and must not load the
 * Cloudflare plugin from vite.config.ts — the plugin cannot start under
 * Vitest (verified Jul 2026: its runner-worker crashes on startup)
 */
export default defineConfig({
  resolve: {
    alias: {
      // Tests run in Node: emulate the Workers runtime module locally, like
      // wrangler's CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_* does for
      // local dev
      "cloudflare:workers": new URL(
        "./src/testing/cloudflare-workers.ts",
        import.meta.url,
      ).pathname,
    },
  },
  test: {
    setupFiles: ["neon-testing/setup", "vitest.clerk.setup.ts"],
    testTimeout: 10000,
  },
});
