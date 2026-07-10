import "dotenv/config";
import { defineConfig } from "vitest/config";
import tsConfigPaths from "vite-tsconfig-paths";

/**
 * Standalone Vitest config: tests run in Node and must not load the
 * Cloudflare plugin from vite.config.ts (it conflicts with Vitest's SSR
 * environment)
 */
export default defineConfig({
  plugins: [tsConfigPaths()],
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
